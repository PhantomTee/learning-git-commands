"use client";

import { useState, useEffect } from "react";
import {
  getCharacter,
  hasCharacter,
  getPromptBalance,
  createCharacter,
  waitForResult,
  createWriteClient,
  Character,
} from "@/lib/genlayer";
import CharacterSheet from "@/components/CharacterSheet";
import Link from "next/link";

export default function CharacterPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "pending">("idle");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    gender: "male" | "female" | "other";
    age: number;
  }>({ name: "", gender: "male", age: 25 });

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
      const [has, bal] = await Promise.all([
        hasCharacter(addr),
        getPromptBalance(addr),
      ]);
      setBalance(Number(bal));
      if (has) {
        const char = await getCharacter(addr);
        setCharacter(char);
      }
    } catch {
      //
    }
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
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const txHash = await createCharacter(writeClient, form.name, form.gender, form.age);
      await waitForResult(txHash);
      await loadData(accounts[0]);
      setStatus("idle");
    } catch (err: any) {
      setError(err?.message ?? "Transaction failed");
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
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-400">My Character</h1>
        <div className="text-sm bg-gray-800 px-3 py-1 rounded-full">
          <span className="text-gray-400">Prompts: </span>
          <span className="text-amber-300 font-semibold">{balance}</span>
        </div>
      </div>

      {character ? (
        <CharacterSheet character={character} />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <p className="text-gray-400 text-sm">
            You don't have a character yet. The on-chain AI will assign your
            class based on your name and background.
          </p>

          <form onSubmit={handleCreateCharacter} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={32}
                placeholder="Theron Ashvale"
                className="w-full bg-gray-950 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-gray-600 transition-colors"
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium text-gray-300">Age</label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))}
                  className="w-full bg-gray-950 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium text-gray-300">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gender: e.target.value as "male" | "female" | "other",
                    }))
                  }
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
              disabled={status === "pending" || !form.name.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg transition-colors"
            >
              {status === "pending" ? "⏳ Generating character on-chain…" : "Create Character"}
            </button>
          </form>
        </div>
      )}

      <Link href="/" className="block text-center text-xs text-gray-500 hover:text-amber-400">
        ← Back to World Map
      </Link>
    </div>
  );
}
