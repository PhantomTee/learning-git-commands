"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWriteClient, createChapter, waitForResult } from "@/lib/genlayer";

export default function CreateChapterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    scenario: "",
    win_condition: "",
    difficulty: 10,
  });
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eth = (window as any).ethereum;
    if (!eth) return setError("Install MetaMask to create a chapter");

    setStatus("pending");
    setError(null);

    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});

      const txHash = await createChapter(
        writeClient,
        form.title,
        form.scenario,
        form.win_condition,
        form.difficulty
      );
      await waitForResult(txHash);
      setStatus("done");
      router.push("/");
    } catch (err: any) {
      setError(err?.message ?? "Transaction failed");
      setStatus("idle");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Create a Chapter</h1>
        <p className="text-gray-400 text-sm mt-1">
          Write a scenario and win condition. Explorers submit actions —
          the on-chain AI dungeon master judges every attempt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Chapter Title</label>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
            maxLength={80}
            placeholder="The Caverns of Endless Dread"
            className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-gray-600 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Scenario</label>
          <p className="text-xs text-gray-500">
            Set the scene. Describe the environment, NPCs, dangers, and stakes. (max 1000 chars)
          </p>
          <textarea
            value={form.scenario}
            onChange={(e) => update("scenario", e.target.value)}
            required
            maxLength={1000}
            rows={6}
            placeholder="You stand at the entrance of a collapsing dungeon…"
            className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-3 text-sm resize-none outline-none placeholder:text-gray-600 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Win Condition</label>
          <p className="text-xs text-gray-500">
            What must the Explorer achieve? The AI evaluates every action against this. (max 300 chars)
          </p>
          <textarea
            value={form.win_condition}
            onChange={(e) => update("win_condition", e.target.value)}
            required
            maxLength={300}
            rows={3}
            placeholder="Rescue the merchant and cross the bridge without alerting more than one goblin."
            className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-3 text-sm resize-none outline-none placeholder:text-gray-600 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">
            Difficulty — {form.difficulty}
            <span className="ml-2 text-xs text-gray-500 font-normal">
              (required d20 roll to succeed)
            </span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Easy 1</span>
            <input
              type="range"
              min={1}
              max={20}
              value={form.difficulty}
              onChange={(e) => update("difficulty", Number(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-xs text-gray-500">20 Hard</span>
          </div>
          <p className="text-xs text-gray-600">
            {form.difficulty <= 5 && "Very easy — most explorers will succeed."}
            {form.difficulty > 5 && form.difficulty <= 10 && "Moderate — a solid action will get through."}
            {form.difficulty > 10 && form.difficulty <= 15 && "Challenging — requires a clever, on-theme action."}
            {form.difficulty > 15 && "Brutal — only the best actions will prevail."}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            status === "pending" ||
            !form.title.trim() ||
            !form.scenario.trim() ||
            !form.win_condition.trim()
          }
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors"
        >
          {status === "pending" ? "⏳ Writing to Genlayer…" : "Publish Chapter"}
        </button>
      </form>
    </div>
  );
}
