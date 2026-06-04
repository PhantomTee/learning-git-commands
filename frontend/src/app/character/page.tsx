"use client";

import { useState, useEffect } from "react";
import {
  getCharacter,
  hasCharacter,
  getCreatorBalance,
  getClaimablePrizes,
  createCharacter,
  claimPrize,
  withdrawCreator,
  waitForResult,
  createWriteClient,
  formatGEN,
  Character,
  ClaimablePrize,
} from "@/lib/genlayer";
import CharacterSheet from "@/components/CharacterSheet";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function CharacterPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [creatorBalance, setCreatorBalance] = useState<number>(0);
  const [claimablePrizes, setClaimablePrizes] = useState<ClaimablePrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "pending">("idle");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", gender: "male", age: 25 });
  const { success, error: toastError, loading: toastLoading, dismiss } = useToast();

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
    try {
      const [has, creatorBal, prizes] = await Promise.all([
        hasCharacter(addr),
        getCreatorBalance(addr),
        getClaimablePrizes(addr),
      ]);
      setCreatorBalance(Number(creatorBal));
      setClaimablePrizes(prizes);
      if (has) {
        const char = await getCharacter(addr);
        setCharacter(char);
      }
    } catch { /* RPC unavailable */ }
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
    const tid = toastLoading("Summoning your character…", "The on-chain AI is choosing your class");
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await createCharacter(writeClient, form.name, form.gender as "male" | "female" | "other", form.age);
      await waitForResult(txHash);
      dismiss(tid);
      success("Character created!", "Your legend begins.");
      await loadData(accounts[0]);
      setStatus("idle");
    } catch (err: any) {
      dismiss(tid);
      const msg = err?.message ?? "Transaction failed";
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
      await waitForResult(txHash);
      dismiss(tid);
      success("Prize claimed!", "Your GEN has been sent to your wallet.");
      await loadData(accounts[0]);
      setStatus("idle");
    } catch (err: any) {
      dismiss(tid);
      toastError("Claim failed", err?.message ?? "Transaction failed");
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
      await waitForResult(txHash);
      dismiss(tid);
      success("Withdrawn!", "Your creator earnings are in your wallet.");
      await loadData(accounts[0]);
      setStatus("idle");
    } catch (err: any) {
      dismiss(tid);
      toastError("Withdrawal failed", err?.message ?? "Transaction failed");
      setStatus("idle");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;
  }

  if (!address) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
        <p className="text-5xl">🧙</p>
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

          {/* ── Claimable prizes notification ── */}
          {claimablePrizes.length > 0 && (
            <div className="space-y-2">
              <p className="font-display text-xs text-amber-400 tracking-widest uppercase flex items-center gap-2">
                <span className="animate-pulse">🏆</span> You have prizes to claim!
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
                    {status === "pending" ? "⏳" : "Claim"}
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
                {status === "pending" ? "⏳" : "Withdraw"}
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 border border-red-500/30 bg-red-950/20 rounded-lg p-3 font-display">
              ⚠ {error}
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
                <label htmlFor="char-gender" className="text-sm font-medium text-gray-300">Gender</label>
                <select
                  id="char-gender"
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full bg-gray-950 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
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
              {status === "pending" ? "⏳ Generating character on-chain…" : "Create Character"}
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
