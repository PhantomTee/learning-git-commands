"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getChapter, getAttempts, submitAction, closeChapter, claimPrize, waitForResult,
  createWriteClient, hasWinner, hasCharacter, formatGEN, explorerTxUrl, normaliseError,
  Chapter, Attempt,
} from "@/lib/genlayer";
import ActionInput from "@/components/ActionInput";
import { ChapterActivityFeed } from "@/components/ActivityFeed";
import { useToast } from "@/components/Toast";
import { useCharacterGate } from "@/hooks/useCharacterGate";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const MIN_ATTEMPTS_BEFORE_CLOSE = 10;

export default function ChapterPage() {
  const params = useParams();
  const chapterId = Number(params.id);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hasChar, setHasChar] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();
  const { requireCharacter } = useCharacterGate();
  const recordActivity = useMutation(api.world.recordActivity);

  useEffect(() => {
    async function load() {
      try {
        const [ch, atts] = await Promise.all([
          getChapter(chapterId),
          getAttempts(chapterId, 0, 50),
        ]);
        setChapter(ch);
        setAttempts(atts);
      } catch { /* RPC unavailable */ }
      finally { setLoading(false); }
    }
    load();

    const eth = (window as any).ethereum;
    if (eth) {
      eth.request({ method: "eth_accounts" }).then(async (a: string[]) => {
        if (a[0]) {
          setWalletAddress(a[0]);
          const exists = await hasCharacter(a[0]).catch(() => false);
          setHasChar(exists);
        }
      });
    }
  }, [chapterId]);

  async function guardAction() {
    const gate = await requireCharacter();
    if (gate.ok) {
      setWalletAddress(gate.account);
      setHasChar(true);
    } else if (gate.account) {
      setWalletAddress(gate.account);
      setHasChar(false);
    }
    return gate;
  }

  async function handleAction(action: string, gatedAccount?: string): Promise<{ attempt: Attempt | null; txHash: string }> {
    if (!chapter) throw new Error("Chapter not loaded");

    let account = gatedAccount;
    if (!account) {
      const gate = await guardAction();
      if (gate.ok) account = gate.account;
    }
    if (!account) {
      throw new Error("Create a character before submitting an action.");
    }

    const writeClient = createWriteClient(account as `0x${string}`);
    await writeClient.connect("studionet").catch(() => {});

    const txHash = await submitAction(writeClient, chapterId, action, BigInt(chapter.price_per_attempt));
    await waitForResult(txHash);

    const [updatedCh, updatedAttempts] = await Promise.all([
      getChapter(chapterId),
      getAttempts(chapterId, 0, 50),
    ]);
    setChapter(updatedCh);
    setAttempts(updatedAttempts);
    const attempt = updatedAttempts[updatedAttempts.length - 1] ?? null;
    if (attempt) {
      await recordActivity({
        type: "attempt_submitted",
        actor: account,
        target_address: chapter.creator,
        chapter_id: chapterId,
        chapter_title: chapter.title,
        tx_hash: txHash,
        message: `${account.slice(0, 6)}...${account.slice(-4)} ${attempt.success ? "became current leader for" : "attempted"} ${chapter.title}.`,
        success: attempt.success,
        roll: attempt.roll,
      }).catch(() => {});

      const oldLeader = chapter.fomo_winner.explorer.toLowerCase();
      const newLeader = updatedCh.fomo_winner.explorer.toLowerCase();
      if (attempt.success && newLeader !== oldLeader) {
        await recordActivity({
          type: "winner_changed",
          actor: account,
          target_address: oldLeader.startsWith("0x000000") ? chapter.creator : oldLeader,
          chapter_id: chapterId,
          chapter_title: chapter.title,
          tx_hash: txHash,
          message: `${account.slice(0, 6)}...${account.slice(-4)} became the current leader for ${chapter.title}.`,
          success: true,
          roll: attempt.roll,
        }).catch(() => {});
      }
    }
    return { attempt, txHash };
  }

  async function handleClose() {
    if (!chapter) return;
    const isExpired = chapter.closes_at !== undefined && Date.now() / 1000 >= chapter.closes_at;
    if (!isExpired && chapter.attempt_count < MIN_ATTEMPTS_BEFORE_CLOSE) {
      toastError("Chapter cannot close yet", `This chapter can close after ${MIN_ATTEMPTS_BEFORE_CLOSE} attempts.`);
      return;
    }
    if (!confirm("Close this chapter? Explorers can no longer attempt it. The current leader becomes the final winner and can claim the prize pool.")) return;
    const gate = await requireCharacter();
    if (!gate.ok) return;

    setClosing(true);
    const tid = toastLoading("Closing chapter…", "Writing the final page on-chain");
    try {
      const writeClient = createWriteClient(gate.account as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await closeChapter(writeClient, chapterId);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      await recordActivity({
        type: "chapter_closed",
        actor: gate.account,
        target_address: chapter?.fomo_winner.explorer,
        chapter_id: chapterId,
        chapter_title: chapter?.title,
        tx_hash: txHash,
        message: `${chapter?.title ?? "A chapter"} was closed.`,
      }).catch(() => {});
      dismiss(tid);
      success("Chapter closed", "The final winner can now claim the prize pool.", { href: explorerTxUrl(txHash), label: "View transaction" });
      const updatedCh = await getChapter(chapterId);
      setChapter(updatedCh);
    } catch (err: any) {
      dismiss(tid);
      toastError("Failed to close", normaliseError(err).message);
    } finally {
      setClosing(false);
    }
  }

  async function handleClaimFinalPool() {
    if (!chapter || !hasWinner(chapter) || chapter.active || chapter.fomo_winner.prize_claimed) return;
    const gate = await requireCharacter();
    if (!gate.ok) return;
    if (gate.account.toLowerCase() !== chapter.fomo_winner.explorer.toLowerCase()) {
      toastError("Not claimable", "Only the final winner can claim this pool.");
      return;
    }

    setClaiming(true);
    const tid = toastLoading("Claiming final pool…", "Sending your claim on-chain");
    try {
      const writeClient = createWriteClient(gate.account as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await claimPrize(writeClient, chapterId);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      await recordActivity({
        type: "prize_claimed",
        actor: gate.account,
        chapter_id: chapterId,
        chapter_title: chapter.title,
        amount_wei: String(chapter.prize_pool),
        tx_hash: txHash,
        message: `${gate.account.slice(0, 6)}...${gate.account.slice(-4)} claimed the final pool for ${chapter.title}.`,
      }).catch(() => {});
      dismiss(tid);
      success("Final pool claimed!", "Your GEN has been sent to your wallet.", { href: explorerTxUrl(txHash), label: "View transaction" });
      const updatedCh = await getChapter(chapterId);
      setChapter(updatedCh);
    } catch (err: any) {
      dismiss(tid);
      toastError("Claim failed", normaliseError(err).message);
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-amber-900/60 font-display tracking-widest">Loading chapter…</div>;
  }

  if (!chapter) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-amber-900/60 font-display">Chapter not found.</p>
        <Link href="/" className="text-amber-400 hover:underline text-sm block">← Back to Live Map</Link>
      </div>
    );
  }

  const winner = hasWinner(chapter);
  const fw = chapter.fomo_winner;
  const prizeGEN = formatGEN(chapter.prize_pool);
  const priceGEN = formatGEN(chapter.price_per_attempt);
  const leaderTitle = chapter.active ? "Current Leader" : "Final Winner";
  const closeAttemptCount = Math.min(chapter.attempt_count, MIN_ATTEMPTS_BEFORE_CLOSE);
  // After closes_at the contract lets anyone close, so the standing leader can
  // finally claim a pool the creator has no incentive to release.
  const expired = chapter.closes_at !== undefined && Date.now() / 1000 >= chapter.closes_at;
  const canCloseChapter = expired || chapter.attempt_count >= MIN_ATTEMPTS_BEFORE_CLOSE;
  const connectedAccount = walletAddress?.toLowerCase() ?? null;
  const isCreator = connectedAccount === chapter.creator.toLowerCase();
  const isCurrentLeader = !!connectedAccount && winner && connectedAccount === fw.explorer.toLowerCase();
  const canClaimFinalPool = !!connectedAccount && winner && !chapter.active && !fw.prize_claimed && connectedAccount === fw.explorer.toLowerCase();
  const canExplore = chapter.active && !!walletAddress && hasChar === true && !isCreator;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back */}
      <Link href="/" className="text-xs text-amber-900/60 hover:text-amber-400 font-display tracking-widest uppercase">
        ← Live Map
      </Link>

      {/* Header */}
      <div className="panel p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="font-display font-black text-2xl sm:text-3xl text-amber-400 tracking-wider leading-tight">
            {chapter.title}
          </h1>
          <span className={`shrink-0 text-xs px-3 py-1 rounded-full font-display tracking-widest uppercase ${
            chapter.active ? "bg-green-900/40 text-green-400 border border-green-800/50" : "bg-gray-800/60 text-gray-500 border border-gray-700/50"
          }`}>
            {chapter.active ? "● Active" : "● Closed"}
          </span>
        </div>

        <div className="gold-divider" />

        {/* Stats strip */}
        <div className="flex flex-wrap gap-4 text-xs font-display">
          <div className="text-center">
            <div className="text-amber-400 font-bold text-base">{chapter.difficulty}/20</div>
            <div className="text-amber-900/60 uppercase tracking-widest">Difficulty</div>
          </div>
          <div className="text-center">
            <div className="text-amber-400 font-bold text-base">{chapter.attempt_count}</div>
            <div className="text-amber-900/60 uppercase tracking-widest">Attempts</div>
          </div>
          <div className="text-center">
            <div className="text-amber-400 font-bold text-base">{priceGEN}</div>
            <div className="text-amber-900/60 uppercase tracking-widest">Attempt Fee</div>
          </div>
          {chapter.prize_pool > 0 && (
            <div className="text-center">
              <div className="text-amber-300 font-bold text-base">{prizeGEN}</div>
              <div className="text-amber-900/60 uppercase tracking-widest">Prize Pool</div>
            </div>
          )}
        </div>

        <div className="text-xs text-amber-900/50 font-mono">
          by {chapter.creator.slice(0, 8)}…{chapter.creator.slice(-6)}
        </div>
      </div>

      {/* Scenario */}
      <div className="panel p-5 space-y-3">
        <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase">Scenario</h2>
        <p className="text-amber-200/70 leading-relaxed text-sm">{chapter.scenario}</p>
        <div className="gold-divider" />
        <div className="text-xs text-amber-900/60">
          <span className="text-amber-500 font-display uppercase tracking-widest">Win condition — </span>
          {chapter.win_condition}
        </div>
      </div>

      <div className="panel p-4 space-y-2"
        style={{ border: "1px solid rgba(245,158,11,0.28)", background: "rgba(245,158,11,0.05)" }}>
        <h2 className="font-display text-sm text-amber-400 tracking-wider">How winning works</h2>
        <p className="text-xs text-amber-200/65 leading-relaxed">
          A successful action does not close the chapter. It makes you the current leader. Other explorers can still attempt the chapter and replace you. When the chapter closes, the current leader can claim the prize pool.
        </p>
      </div>

      {/* Action input */}
      {chapter.active && !walletAddress && (
        <div className="panel p-4 text-center"
          style={{ border: "1px solid rgba(245,158,11,0.22)", background: "rgba(245,158,11,0.04)" }}>
          <p className="font-display text-sm text-amber-300">Connect wallet to explore this chapter.</p>
        </div>
      )}

      {chapter.active && walletAddress && hasChar === false && !isCreator && (
        <div className="panel p-4 text-center space-y-3"
          style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.04)" }}>
          <p className="text-sm text-amber-200/70 font-display">
            Create a character before exploring.
          </p>
          <Link href="/character" className="btn-gold inline-block px-4 py-2 rounded-lg text-xs">
            Create Character
          </Link>
        </div>
      )}

      {chapter.active && isCreator && (
        <div className="panel p-4 text-sm text-amber-200/60"
          style={{ border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.03)" }}>
          You created this chapter, so you cannot submit explorer actions here.
        </div>
      )}

      {canExplore && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />Submit Your Action<span className="gold-divider flex-1" />
          </h2>
          <p className="text-xs text-amber-900/60 text-center font-display">
            Attempt Fee: {priceGEN} · Max 3 attempts per chapter
          </p>
          <ActionInput
            chapterId={chapterId}
            winCondition={chapter.win_condition}
            priceGEN={priceGEN}
            onSubmit={handleAction}
            beforeSubmit={guardAction}
            disabled={false}
          />
        </div>
      )}

      {/* Prize pool banner */}
      {chapter.prize_pool > 0 && (
        <div className="panel p-4 flex items-center gap-4"
          style={{ border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.06)" }}>
          <span className="font-display font-bold text-amber-400 text-lg">Prize</span>
          <div className="flex-1">
            <div className="font-display font-bold text-amber-400 text-lg">{prizeGEN} Prize Pool</div>
            <div className="text-xs text-amber-900/60">
              {chapter.active
                ? "Accumulating — beat the current leader and hold the lead until the chapter closes"
                : winner && !fw.prize_claimed
                ? `Claimable by final winner ${fw.explorer.slice(0, 8)}…${fw.explorer.slice(-6)}`
                : fw.prize_claimed ? "Final pool already claimed" : "No final winner — pool returned to protocol"}
            </div>
          </div>
        </div>
      )}

      {/* Current leader / final winner */}
      {winner && (
        <div className="panel p-4 flex items-center gap-4"
          style={{ border: "1px solid rgba(245,158,11,0.3)" }}>
          <span className="font-display font-bold text-amber-400">{chapter.active ? "Lead" : "Final"}</span>
          <div className="flex-1">
            <div className="font-display font-bold text-amber-400">{leaderTitle}</div>
            <div className="text-sm text-amber-200/60">
              {fw.explorer.slice(0, 8)}…{fw.explorer.slice(-6)}
              <span className="ml-2 text-amber-900/60">· rolled {fw.roll}</span>
              {fw.prize_claimed && <span className="ml-2 text-green-500/70">· final pool claimed</span>}
            </div>
            {isCurrentLeader && chapter.active && (
              <p className="text-xs text-amber-200/65 mt-1">
                You are the current leader. You can claim only after this chapter closes.
              </p>
            )}
            {!chapter.active && winner && !fw.prize_claimed && (
              <p className="text-xs text-amber-200/65 mt-1">
                The final winner can claim the prize pool now.
              </p>
            )}
          </div>
          {canClaimFinalPool && (
            <button
              onClick={handleClaimFinalPool}
              disabled={claiming}
              className="btn-gold px-4 py-2 rounded-lg text-xs shrink-0 disabled:opacity-40"
            >
              {claiming ? "Claiming…" : "Claim Final Pool"}
            </button>
          )}
        </div>
      )}

      {!winner && !chapter.active && (
        <div className="panel p-4 text-sm text-amber-200/60"
          style={{ border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.03)" }}>
          This chapter closed without a final winner.
        </div>
      )}

      {/* Creator controls — also shown to everyone once the chapter expires */}
      {chapter.active && (isCreator || expired) && (
        <div className="panel p-4 flex items-center justify-between gap-3"
          style={{ border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.04)" }}>
          <div>
            <p className="font-display text-sm text-red-400">
              {isCreator ? "Creator Controls" : "Chapter Expired"}
            </p>
            <p className="text-xs text-amber-900/60">
              Closing locks the chapter. The current leader becomes the final winner and can claim the prize pool.
            </p>
            <p className="text-xs text-amber-200/60 mt-1">
              {expired
                ? "This chapter has run its course — anyone can close it now so the leader can claim."
                : `This chapter can close after ${MIN_ATTEMPTS_BEFORE_CLOSE} attempts.`}
            </p>
            {!expired && (
              <p className="text-xs text-amber-200/60 mt-1">
                {MIN_ATTEMPTS_BEFORE_CLOSE} attempts are required so explorers have time to challenge the current leader before the pool is finalized.
              </p>
            )}
            <p className="text-xs text-amber-900/60">
              Attempts so far: {closeAttemptCount}/{MIN_ATTEMPTS_BEFORE_CLOSE}.
            </p>
            {!canCloseChapter && (
              <p className="text-xs text-red-300/70 mt-1">
                Closing is disabled until explorers have made {MIN_ATTEMPTS_BEFORE_CLOSE - chapter.attempt_count} more attempts.
              </p>
            )}
            {!expired && chapter.closes_at !== undefined && (
              <p className="text-xs text-amber-900/50 mt-1">
                Opens to everyone on {new Date(chapter.closes_at * 1000).toLocaleDateString()}.
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={closing || !canCloseChapter}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-display tracking-wider border border-red-800/50 text-red-400 hover:border-red-600 hover:text-red-300 transition-colors disabled:opacity-40"
            style={{ background: "rgba(220,38,38,0.08)" }}
          >
            {closing ? "Closing…" : "Close Chapter"}
          </button>
        </div>
      )}

      {/* Attempt feed */}
      {attempts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />Battle Chronicle ({attempts.length})<span className="gold-divider flex-1" />
          </h2>
          <div className="space-y-3">
            {[...attempts].reverse().map((att, i) => (
              <div key={i} className="panel p-4 space-y-2"
                style={att.success
                  ? { border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.03)" }
                  : { border: "1px solid rgba(245,158,11,0.08)" }}>
                {/* Explorer + roll badge */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-amber-900/50">
                    {att.explorer.slice(0, 6)}…{att.explorer.slice(-4)}
                  </span>
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-display font-black border-2 ${
                    att.success
                      ? "border-green-500/50 text-green-400 bg-green-950/40"
                      : "border-red-900/40 text-red-400/70 bg-red-950/20"
                  }`}>
                    {att.roll}
                  </div>
                </div>
                {/* Action quote */}
                <p className="text-xs text-amber-200/40 italic border-l-2 border-amber-900/30 pl-2">
                  "{att.action}"
                </p>
                {/* Judgment — the story */}
                <p className={`text-sm leading-relaxed ${att.success ? "text-green-300/80" : "text-amber-200/60"}`}>
                  {att.judgment}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ChapterActivityFeed chapterId={chapterId} />
    </div>
  );
}
