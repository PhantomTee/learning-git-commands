"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getChapter, getAttempts, submitAction, closeChapter, waitForResult,
  createWriteClient, hasWinner, formatGEN, explorerTxUrl,
  Chapter, Attempt,
} from "@/lib/genlayer";
import ActionInput from "@/components/ActionInput";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function ChapterPage() {
  const params = useParams();
  const chapterId = Number(params.id);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();

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
    if (eth) eth.request({ method: "eth_accounts" }).then((a: string[]) => { if (a[0]) setWalletAddress(a[0]); });
  }, [chapterId]);

  async function handleAction(action: string): Promise<{ attempt: Attempt | null; txHash: string }> {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("Install MetaMask to submit actions");
    if (!chapter) throw new Error("Chapter not loaded");

    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setWalletAddress(accounts[0]);
    const writeClient = createWriteClient(accounts[0] as `0x${string}`);
    await writeClient.connect("studionet").catch(() => {});

    const txHash = await submitAction(writeClient, chapterId, action, BigInt(chapter.price_per_attempt));
    await waitForResult(txHash);

    const [updatedCh, updatedAttempts] = await Promise.all([
      getChapter(chapterId),
      getAttempts(chapterId, 0, 50),
    ]);
    setChapter(updatedCh);
    setAttempts(updatedAttempts);
    return { attempt: updatedAttempts[updatedAttempts.length - 1] ?? null, txHash };
  }

  async function handleClose() {
    if (!confirm("Close this chapter? Explorers can no longer attempt it. The current FOMO leader will be able to claim the prize pool.")) return;
    setClosing(true);
    const tid = toastLoading("Closing chapter…", "Writing the final page on-chain");
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await closeChapter(writeClient, chapterId);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      dismiss(tid);
      success("Chapter closed", "The FOMO winner can now claim their prize.", { href: explorerTxUrl(txHash), label: "View transaction" });
      const updatedCh = await getChapter(chapterId);
      setChapter(updatedCh);
    } catch (err: any) {
      dismiss(tid);
      toastError("Failed to close", err?.message ?? "Transaction failed");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-amber-900/60 font-display tracking-widest">Loading chapter…</div>;
  }

  if (!chapter) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-amber-900/60 font-display">Chapter not found.</p>
        <Link href="/" className="text-amber-400 hover:underline text-sm block">← Back to World Map</Link>
      </div>
    );
  }

  const winner = hasWinner(chapter);
  const fw = chapter.fomo_winner;
  const prizeGEN = formatGEN(chapter.prize_pool);
  const priceGEN = formatGEN(chapter.price_per_attempt);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back */}
      <Link href="/" className="text-xs text-amber-900/60 hover:text-amber-400 font-display tracking-widest uppercase">
        ← World Map
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
            <div className="text-amber-900/60 uppercase tracking-widest">Per Action</div>
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

      {/* Prize pool banner */}
      {chapter.prize_pool > 0 && (
        <div className="panel p-4 flex items-center gap-4"
          style={{ border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.06)" }}>
          <span className="text-3xl">🏆</span>
          <div className="flex-1">
            <div className="font-display font-bold text-amber-400 text-lg">{prizeGEN} Prize Pool</div>
            <div className="text-xs text-amber-900/60">
              {chapter.active
                ? "Accumulating — beat the FOMO leader to claim it when the chapter closes"
                : winner && !fw.prize_claimed
                ? `Claimable by ${fw.explorer.slice(0, 8)}…${fw.explorer.slice(-6)}`
                : fw.prize_claimed ? "Prize already claimed" : "No winner — pool returned to protocol"}
            </div>
          </div>
        </div>
      )}

      {/* FOMO winner */}
      {winner && (
        <div className="panel p-4 flex items-center gap-4"
          style={{ border: "1px solid rgba(245,158,11,0.3)" }}>
          <span className="text-3xl">⚡</span>
          <div>
            <div className="font-display font-bold text-amber-400">FOMO Leader</div>
            <div className="text-sm text-amber-200/60">
              {fw.explorer.slice(0, 8)}…{fw.explorer.slice(-6)}
              <span className="ml-2 text-amber-900/60">· rolled {fw.roll}</span>
              {fw.prize_claimed && <span className="ml-2 text-green-500/70">· claimed</span>}
            </div>
          </div>
        </div>
      )}

      {/* Creator controls */}
      {chapter.active && walletAddress?.toLowerCase() === chapter.creator.toLowerCase() && (
        <div className="panel p-4 flex items-center justify-between gap-3"
          style={{ border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.04)" }}>
          <div>
            <p className="font-display text-sm text-red-400">Creator Controls</p>
            <p className="text-xs text-amber-900/60">
              Closing locks the chapter. The current FOMO leader can then claim the prize pool.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={closing}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-display tracking-wider border border-red-800/50 text-red-400 hover:border-red-600 hover:text-red-300 transition-colors disabled:opacity-40"
            style={{ background: "rgba(220,38,38,0.08)" }}
          >
            {closing ? "⏳ Closing…" : "Close Chapter"}
          </button>
        </div>
      )}

      {/* Action input */}
      {chapter.active && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />Submit Your Action<span className="gold-divider flex-1" />
          </h2>
          {!walletAddress && (
            <p className="text-xs text-amber-900/60 text-center font-display">
              Connect your wallet to play · {priceGEN} per action · Max 3 attempts per chapter
            </p>
          )}
          <ActionInput
            chapterId={chapterId}
            winCondition={chapter.win_condition}
            priceGEN={priceGEN}
            onSubmit={handleAction}
            disabled={!chapter.active}
          />
        </div>
      )}

      {/* Attempts log */}
      {attempts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />Explorer Log ({attempts.length})<span className="gold-divider flex-1" />
          </h2>
          <div className="space-y-3">
            {[...attempts].reverse().map((att, i) => (
              <div key={i} className={`panel p-4 space-y-2 ${att.success ? "border-green-800/50" : ""}`}
                style={att.success ? { border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.04)" } : {}}>
                <div className="flex items-center gap-2 text-xs text-amber-900/60">
                  <span className={att.success ? "text-green-400" : "text-red-400"}>
                    {att.success ? "✓ Success" : "✗ Fail"}
                  </span>
                  <span>·</span>
                  <span>d20: <span className="text-amber-400 font-bold">{att.roll}</span></span>
                  <span>·</span>
                  <span className="font-mono">{att.explorer.slice(0, 6)}…{att.explorer.slice(-4)}</span>
                </div>
                <p className="text-xs text-amber-200/40 italic">"{att.action}"</p>
                <p className="text-sm text-amber-200/70">{att.judgment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
