"use client";

import { useState, useEffect } from "react";
import {
  getCharacter,
  getCreatorBalance,
  getClaimablePrizes,
  getChapters,
  getCreatorNft,
  createCharacter,
  claimPrize,
  withdrawCreator,
  waitForResult,
  createWriteClient,
  formatGEN,
  explorerTxUrl,
  normaliseError,
  Character,
  ClaimablePrize,
  Chapter,
} from "@/lib/genlayer";
import CharacterSheet from "@/components/CharacterSheet";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function CharacterPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [creatorBalance, setCreatorBalance] = useState<number>(0);
  const [claimablePrizes, setClaimablePrizes] = useState<ClaimablePrize[]>([]);
  const [createdChapters, setCreatedChapters] = useState<Chapter[]>([]);
  const [creatorNftId, setCreatorNftId]       = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "pending">("idle");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", gender: "male", age: 25 });
  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();
  const recordActivity = useMutation(api.world.recordActivity);

  useEffect(() => {
    async function init() {
      const eth = (window as any).ethereum;
      if (!eth) { setLoading(false); return; }
      const accounts = await eth.request({ method: "eth_accounts" });
      if (!accounts[0]) { setLoading(false); return; }
      setAddress(accounts[0]);
      await loadData(accounts[0]);
      setLoading(false);
    }
    init();
  }, []);

  async function loadData(addr: string) {
    // Call getCharacter directly — success means character exists and we get
    // the data in one call. Throws if no character ("Character does not exist")
    // or RPC unavailable; either way we leave character=null → show create form.
    try {
      const char = await getCharacter(addr);
      setCharacter(char);
    } catch { /* no character or RPC unavailable */ }

    // Secondary data — failures here are non-critical
    try {
      const [creatorBal, prizes, allChapters, nftId] = await Promise.all([
        getCreatorBalance(addr),
        getClaimablePrizes(addr),
        getChapters(0, 100),
        getCreatorNft(addr),
      ]);
      setCreatorBalance(Number(creatorBal));
      setClaimablePrizes(prizes);
      setCreatedChapters(allChapters.filter((c) => c.creator.toLowerCase() === addr.toLowerCase()));
      setCreatorNftId(nftId);
    } catch { /* ignore */ }
  }

  async function connect() {
    const eth = (window as any).ethereum;
    if (!eth) return setError("Install MetaMask to play");
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setAddress(accounts[0]);
    await loadData(accounts[0]);
  }

  async function handleCreateCharacter(e: React.FormEvent) {
    e.preventDefault();
    setStatus("pending");
    setError(null);
    const tid = toastLoading("Creating character…", "Registering on-chain — takes 1–3 min");
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await createCharacter(writeClient, form.name, form.gender as "male" | "female" | "other", form.age);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      dismiss(tid);
      success("Character created!", "Your legend begins.", { href: explorerTxUrl(txHash), label: "View transaction" });
      await loadData(accounts[0]);
      setStatus("idle");
    } catch (err: any) {
      dismiss(tid);
      const msg = normaliseError(err).message;
      // If the character was already created (e.g. duplicate submission), show it
      if (msg.includes("Character already exists") || msg.includes("already exists")) {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: "eth_accounts" });
        if (accounts[0]) await loadData(accounts[0]);
        setStatus("idle");
        return;
      }
      setError(msg);
      toastError("Character creation failed", msg);
      setStatus("idle");
    }
  }

  async function handleClaimPrize(chapterId: number) {
    setStatus("pending");
    const tid = toastLoading("Claiming prize…", "Finalising your victory on-chain");
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await claimPrize(writeClient, chapterId);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      const prize = claimablePrizes.find((item) => item.chapter_id === chapterId);
      await recordActivity({
        type: "prize_claimed",
        actor: accounts[0],
        chapter_id: chapterId,
        chapter_title: prize?.title,
        amount_wei: prize ? String(prize.prize_pool) : undefined,
        tx_hash: txHash,
        message: `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)} claimed the prize${prize?.title ? ` for ${prize.title}` : ""}.`,
      }).catch(() => {});
      dismiss(tid);
      success("Prize claimed!", "Your GEN has been sent to your wallet.", { href: explorerTxUrl(txHash), label: "View transaction" });
      await loadData(accounts[0]);
      setStatus("idle");
    } catch (err: any) {
      dismiss(tid);
      toastError("Claim failed", normaliseError(err).message);
      setStatus("idle");
    }
  }

  async function handleWithdrawCreator() {
    setStatus("pending");
    const tid = toastLoading("Withdrawing earnings…", "Transferring your 30% cut");
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await withdrawCreator(writeClient);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      dismiss(tid);
      success("Withdrawn!", "Your creator earnings are in your wallet.", { href: explorerTxUrl(txHash), label: "View transaction" });
      await loadData(accounts[0]);
      setStatus("idle");
    } catch (err: any) {
      dismiss(tid);
      toastError("Withdrawal failed", normaliseError(err).message);
      setStatus("idle");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;
  }

  if (!address) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
        <p className="font-display text-amber-900/40 tracking-widest text-sm uppercase">Character</p>
        <p className="text-gray-400">Connect your wallet to see your character.</p>
        <button
          onClick={connect}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
      <h1 className="font-display font-black text-2xl text-amber-400 tracking-wider">My Character</h1>

      {character ? (
        <>
          <CharacterSheet character={character} />

          {/* ── Creator NFT badge ── */}
          {creatorNftId > 0 && (
            <div className="panel p-4 flex items-center justify-between gap-3"
              style={{ border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.04)" }}>
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-display font-bold text-amber-400 text-sm">Creator NFT #{creatorNftId}</p>
                  <p className="text-xs text-amber-200/60">You hold a Creator seat · Can write chapters</p>
                </div>
              </div>
              <Link href={`/marketplace/${creatorNftId}`}
                className="text-xs font-display tracking-widest text-amber-300 hover:text-amber-200 transition-colors">
                Manage NFT →
              </Link>
            </div>
          )}

          {/* ── Role identity ── */}
          {(createdChapters.length > 0 || (character.wins ?? 0) > 0 || claimablePrizes.length > 0) && (
            <div className="panel p-5 space-y-3">
              <p className="font-display text-xs tracking-widest uppercase text-amber-900/60">Identity</p>
              <div className="flex flex-wrap gap-3">
                {createdChapters.length > 0 && (
                  <div className="flex-1 min-w-[140px] space-y-1 rounded-lg p-3"
                    style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
                    <span className="font-display text-xs tracking-widest uppercase px-2 py-0.5 rounded text-amber-400"
                      style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                      Creator
                    </span>
                    <p className="text-xs text-amber-200/50 pt-1">
                      {createdChapters.length} {createdChapters.length === 1 ? "chapter" : "chapters"} written
                    </p>
                    <p className="text-xs text-amber-200/50">
                      {createdChapters.reduce((s, c) => s + c.attempt_count, 0)} total attempts received
                    </p>
                  </div>
                )}
                {((character.wins ?? 0) > 0 || claimablePrizes.length > 0) && (
                  <div className="flex-1 min-w-[140px] space-y-1 rounded-lg p-3"
                    style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" }}>
                    <span className="font-display text-xs tracking-widest uppercase px-2 py-0.5 rounded text-purple-400"
                      style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                      Explorer
                    </span>
                    <p className="text-xs text-amber-200/50 pt-1">
                      {character.wins ?? 0} {(character.wins ?? 0) === 1 ? "victory" : "victories"}
                    </p>
                    <p className="text-xs text-amber-200/50">
                      Level {character.level ?? 1} · {character.xp ?? 0}/100 XP
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Claimable prizes notification ── */}
          {claimablePrizes.length > 0 && (
            <div className="space-y-2">
              <p className="font-display text-xs text-amber-400 tracking-widest uppercase flex items-center gap-2">
                You have prizes to claim!
              </p>
              {claimablePrizes.map((prize) => (
                <div key={prize.chapter_id} className="panel p-4 flex items-center justify-between gap-3"
                  style={{ border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.06)" }}>
                  <div className="min-w-0">
                    <p className="font-display text-sm text-amber-300 truncate">{prize.title}</p>
                    <p className="text-xs text-amber-900/60">
                      Prize pool: <span className="text-amber-400 font-bold">{formatGEN(prize.prize_pool)}</span>
                      {" · "}rolled {prize.roll}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaimPrize(prize.chapter_id)}
                    disabled={status === "pending"}
                    className="btn-gold px-4 py-2 rounded-lg text-xs shrink-0"
                  >
                    {status === "pending" ? "…" : "Claim"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Creator earnings ── */}
          {creatorBalance > 0 && (
            <div className="panel p-4 flex items-center justify-between gap-3"
              style={{ border: "1px solid rgba(245,158,11,0.25)" }}>
              <div>
                <p className="font-display text-sm text-amber-300">Creator Earnings</p>
                <p className="text-xs text-amber-900/60">
                  Your 30% cut from chapter attempts: <span className="text-amber-400 font-bold">{formatGEN(creatorBalance)}</span>
                </p>
              </div>
              <button
                onClick={handleWithdrawCreator}
                disabled={status === "pending"}
                className="btn-stone px-4 py-2 rounded-lg text-xs shrink-0"
              >
                {status === "pending" ? "…" : "Withdraw"}
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 border border-red-500/30 bg-red-950/20 rounded-lg p-3 font-display">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <p className="text-gray-400 text-sm">
            You don't have a character yet. Create one — the on-chain AI will
            generate your class, backstory, and stats based on your input.
          </p>

          <form onSubmit={handleCreateCharacter} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="char-name" className="text-sm font-medium text-gray-300">Name</label>
              <input
                id="char-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Theron Ashvale"
                className="w-full bg-gray-950 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-gray-600 transition-colors"
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-1 flex-1">
                <label htmlFor="char-age" className="text-sm font-medium text-gray-300">Age</label>
                <input
                  id="char-age"
                  type="number"
                  min={16}
                  max={120}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))}
                  className="w-full bg-gray-950 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium text-gray-300">Gender</label>
                <div className="flex gap-1 mt-0.5">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, gender: g }))}
                      className="flex-1 py-2.5 rounded-lg text-xs font-display tracking-wider capitalize transition-colors"
                      style={form.gender === g
                        ? { background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.6)", color: "#fbbf24" }
                        : { background: "rgba(17,24,39,1)", border: "1px solid rgba(55,65,81,1)", color: "#9ca3af" }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 border border-red-500/30 bg-red-950/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "pending" || !form.name}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg transition-colors"
            >
              {status === "pending" ? "Generating character on-chain…" : "Create Character"}
            </button>
          </form>
        </div>
      )}

      {error && !character && (
        <div className="text-sm text-red-400">{error}</div>
      )}

      <Link href="/" className="block text-center text-xs text-gray-500 hover:text-amber-400">
        ← Back to World Map
      </Link>
    </div>
  );
}
