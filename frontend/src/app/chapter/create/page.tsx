"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWriteClient, createChapter, generateScenario, waitForResult, genToWei } from "@/lib/genlayer";
import { useToast } from "@/components/Toast";

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
    price_gen: 1,   // price in GEN (min 1)
  });
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const { success, error: toastError, loading: toastLoading, dismiss } = useToast();

  function update(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleGenerate() {
    const eth = (window as any).ethereum;
    if (!eth) return toastError("No wallet", "Install MetaMask to use scenario generation");

    setGenerating(true);
    const tid = toastLoading("Consulting the oracle…", "Paying 10 GEN · AI generating your scenario on-chain");
    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      const gen = await generateScenario(writeClient);
      dismiss(tid);
      success("Scenario generated!", "Fields prefilled — feel free to edit.");
      setForm((f) => ({
        ...f,
        title: gen.title,
        scenario: gen.scenario,
        win_condition: gen.win_condition,
        difficulty: gen.difficulty,
      }));
    } catch (err: any) {
      dismiss(tid);
      toastError("Generation failed", err?.message ?? "Transaction failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eth = (window as any).ethereum;
    if (!eth) return setError("Install MetaMask to create a chapter");

    setStatus("pending");
    setError(null);
    const tid = toastLoading("Publishing chapter…", "Validators writing to the chain — takes 1–3 min");

    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const writeClient = createWriteClient(accounts[0] as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});

      const txHash = await createChapter(
        writeClient,
        form.title,
        form.scenario,
        form.win_condition,
        form.difficulty,
        genToWei(form.price_gen)
      );
      await waitForResult(txHash);
      dismiss(tid);
      success("Chapter published!", "Explorers can now attempt your dungeon.");
      setStatus("done");
      router.push("/");
    } catch (err: any) {
      dismiss(tid);
      const msg = err?.message ?? "Transaction failed";
      setError(msg);
      toastError("Publish failed", msg);
      setStatus("idle");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Create a Chapter</h1>
          <p className="text-gray-400 text-sm mt-1">
            Write a scenario and win condition. Explorers submit actions —
            the on-chain AI dungeon master judges every attempt.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || status === "pending"}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-900/50 text-amber-400 hover:border-amber-500/70 hover:text-amber-300 transition-colors text-xs font-display tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "rgba(245,158,11,0.04)" }}
        >
          {generating
            ? <><span className="animate-spin">⏳</span> Consulting oracle…</>
            : <>✨ Generate for me · 10 GEN</>}
        </button>
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

        {/* Price per attempt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Price per Attempt</label>
            <span className="text-sm font-semibold text-amber-400">{form.price_gen} GEN</span>
          </div>
          <p className="text-xs text-gray-500">
            What explorers pay per action. 60% builds the prize pool · 30% goes to you · 10% protocol.
          </p>
          <input
            type="number"
            min={1}
            step={1}
            value={form.price_gen}
            onChange={(e) => update("price_gen", Math.max(1, Number(e.target.value)))}
            className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
          />
          <div className="p-3 rounded-lg text-xs space-y-1"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex justify-between text-amber-200/60">
              <span>🏆 Prize pool (per attempt)</span>
              <span className="text-amber-400">{(form.price_gen * 0.6).toFixed(2)} GEN</span>
            </div>
            <div className="flex justify-between text-amber-200/60">
              <span>💰 Your earnings (per attempt)</span>
              <span className="text-amber-400">{(form.price_gen * 0.3).toFixed(2)} GEN</span>
            </div>
            <div className="flex justify-between text-amber-200/60">
              <span>⚙ Protocol (per attempt)</span>
              <span className="text-amber-400">{(form.price_gen * 0.1).toFixed(2)} GEN</span>
            </div>
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
