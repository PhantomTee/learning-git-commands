"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWriteClient, createChapter, waitForResult } from "@/lib/genlayer";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Trivial", 4: "Easy", 8: "Medium", 12: "Hard", 16: "Deadly", 20: "Legendary",
};

function difficultyLabel(d: number) {
  const key = [20, 16, 12, 8, 4, 1].find((k) => d >= k) ?? 1;
  return DIFFICULTY_LABELS[key];
}

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
            Set the scene. Describe the environment, NPCs, dangers, and stakes.
          </p>
          <textarea
            value={form.scenario}
            onChange={(e) => update("scenario", e.target.value)}
            required
            rows={6}
            maxLength={1000}
            placeholder="You stand at the entrance of a collapsing dungeon. A trapped merchant calls for help from across a chasm. Three goblins patrol the only bridge. A river of lava flows beneath…"
            className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-3 text-sm resize-none outline-none placeholder:text-gray-600 transition-colors"
          />
          <p className="text-xs text-gray-600 text-right">{form.scenario.length}/1000</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Win Condition</label>
          <p className="text-xs text-gray-500">
            What must the Explorer achieve? The AI dungeon master evaluates every
            action against this exact condition.
          </p>
          <textarea
            value={form.win_condition}
            onChange={(e) => update("win_condition", e.target.value)}
            required
            rows={3}
            maxLength={300}
            placeholder="Rescue the merchant and cross the bridge without alerting more than one goblin."
            className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-3 text-sm resize-none outline-none placeholder:text-gray-600 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Difficulty</label>
            <span className="text-sm font-semibold text-amber-400">
              {form.difficulty} — {difficultyLabel(form.difficulty)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            The d20 roll an explorer needs to succeed. 1 = trivial, 20 = nearly impossible.
          </p>
          <input
            type="range"
            min={1}
            max={20}
            value={form.difficulty}
            onChange={(e) => update("difficulty", Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Trivial (1)</span>
            <span>Legendary (20)</span>
          </div>
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
            !form.title ||
            !form.scenario ||
            !form.win_condition
          }
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors"
        >
          {status === "pending" ? "⏳ Writing to Genlayer…" : "Publish Chapter"}
        </button>
      </form>
    </div>
  );
}
