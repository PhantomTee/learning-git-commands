"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createWriteClient,
  createChapter,
  generateScenario,
  waitForResult,
  readLeaderResult,
  genToWei,
  explorerTxUrl,
  normaliseError,
  GeneratedScenario,
  DEFAULT_BASE_PRIZE_GEN,
  difficultyMultiplierBps,
  getRequiredPublishDepositLocal,
  formatGEN,
} from "@/lib/genlayer";
import { revalidateHome } from "@/app/actions";
import { useToast } from "@/components/Toast";
import { useCharacterGate } from "@/hooks/useCharacterGate";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const HISTORY_KEY = "scenario_history";
const MAX_HISTORY = 10;
const MIN_BASE_PRIZE_GEN = 10;

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Trivial", 4: "Easy", 8: "Medium", 12: "Hard", 16: "Deadly", 20: "Legendary",
};

function difficultyLabel(d: number) {
  const key = [20, 16, 12, 8, 4, 1].find((k) => d >= k) ?? 1;
  return DIFFICULTY_LABELS[key];
}

interface HistoryEntry extends GeneratedScenario {
  ts: number;
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (e) => e && typeof e.title === "string" && typeof e.scenario === "string" &&
             typeof e.win_condition === "string" && typeof e.difficulty === "number"
    );
  } catch { return []; }
}

function saveToHistory(entry: GeneratedScenario) {
  const history = loadHistory();
  const next: HistoryEntry[] = [{ ...entry, ts: Date.now() }, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export default function CreateChapterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    scenario: "",
    win_condition: "",
    difficulty: 10,
    base_prize_gen: DEFAULT_BASE_PRIZE_GEN,
    price_gen: 1,
  });
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();
  const { requireCharacter } = useCharacterGate();
  const recordActivity = useMutation(api.world.recordActivity);
  const safeBasePrizeGen = Number.isFinite(form.base_prize_gen) ? form.base_prize_gen : 0;
  const basePrizeWei = genToWei(safeBasePrizeGen);
  const requiredPublishDepositWei = getRequiredPublishDepositLocal(basePrizeWei, form.difficulty);
  const multiplierBps = difficultyMultiplierBps(form.difficulty);
  const multiplierLabel = `${(multiplierBps / 10000).toFixed(1)}x`;

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function update(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function applyScenario(entry: GeneratedScenario) {
    setForm((f) => ({
      ...f,
      title: entry.title,
      scenario: entry.scenario,
      win_condition: entry.win_condition,
      difficulty: entry.difficulty,
    }));
    setHistoryOpen(false);
  }

  async function handleGenerate() {
    const gate = await requireCharacter();
    if (!gate.ok) return;

    setGenerating(true);
    setPendingTxHash(null);
    const tid = toastLoading("Consulting the oracle…", "Paying 10 GEN · AI generating on-chain — takes ~1 min");
    try {
      const writeClient = createWriteClient(gate.account as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});
      let txHash = "";
      const gen = await generateScenario(writeClient, (hash) => {
        txHash = hash;
        setPendingTxHash(hash);
        toastUpdate(tid, { message: "Transaction submitted — waiting for validators", link: { href: explorerTxUrl(hash), label: "View transaction" } });
      });
      dismiss(tid);
      success("Scenario generated!", "Fields prefilled — feel free to edit.", txHash ? { href: explorerTxUrl(txHash), label: "View transaction" } : undefined);
      setPendingTxHash(null);
      applyScenario(gen);
      setHistory(saveToHistory(gen));
    } catch (err: any) {
      dismiss(tid);
      const { message: msg } = normaliseError(err);
      const link = pendingTxHash ? { href: explorerTxUrl(pendingTxHash), label: "Check on explorer" } : undefined;
      toastError("Generation failed", msg, link);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (safeBasePrizeGen < MIN_BASE_PRIZE_GEN) {
      const msg = "Base prize must be at least 10 GEN.";
      setError(msg);
      toastError("Base prize too low", msg);
      return;
    }

    const gate = await requireCharacter();
    if (!gate.ok) {
      setError(gate.message);
      return;
    }

    setStatus("pending");
    setError(null);
    const tid = toastLoading("Publishing chapter…", "Validators writing to the chain — takes 1–3 min");

    try {
      const writeClient = createWriteClient(gate.account as `0x${string}`);
      await writeClient.connect("studionet").catch(() => {});

      const txHash = await createChapter(
        writeClient,
        form.title,
        form.scenario,
        form.win_condition,
        form.difficulty,
        basePrizeWei,
        genToWei(form.price_gen),
        requiredPublishDepositWei
      );
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      const chapterId = await readLeaderResult(txHash);
      if (typeof chapterId !== "number") {
        dismiss(tid);
        toastError("Publish failed", "Transaction was rejected on-chain — make sure you have a character.", { href: explorerTxUrl(txHash), label: "View transaction" });
        setStatus("idle");
        return;
      }
      await recordActivity({
        type: "chapter_created",
        actor: gate.account,
        chapter_id: chapterId,
        chapter_title: form.title,
        tx_hash: txHash,
        message: `${gate.account.slice(0, 6)}...${gate.account.slice(-4)} published ${form.title}.`,
      }).catch(() => {});
      await revalidateHome();
      dismiss(tid);
      success("Chapter published!", "Explorers can now attempt your dungeon.", { href: explorerTxUrl(txHash), label: "View transaction" });
      setStatus("done");
      router.push(`/chapter/${chapterId}`);
    } catch (err: any) {
      dismiss(tid);
      const { message: msg } = normaliseError(err);
      setError(msg);
      toastError("Publish failed", msg);
      setStatus("idle");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header + generate button */}
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
          {generating ? "Consulting oracle…" : "Generate for me · 10 GEN (AI draft)"}
        </button>
      </div>

      {/* AI draft notice */}
      <p className="text-xs text-amber-700/70 -mt-2">
        Generated content is an AI draft — not stored on-chain until you publish the chapter.
      </p>

      {/* Pending tx banner */}
      {generating && pendingTxHash && (
        <a
          href={explorerTxUrl(pendingTxHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-display tracking-wider"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)", color: "#d97706" }}
        >
          <span className="flex-1">Transaction submitted — validators are computing your scenario</span>
          <span className="shrink-0 underline">View ↗</span>
        </a>
      )}

      {/* Scenario history */}
      {history.length > 0 && (
        <div className="rounded-lg" style={{ border: "1px solid rgba(245,158,11,0.18)" }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setHistoryOpen((o) => !o); }}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-display tracking-widest uppercase transition-colors hover:bg-amber-900/10 rounded-lg"
            style={{ background: "rgba(245,158,11,0.04)", color: "#d97706", touchAction: "manipulation" }}
          >
            <span>✦ Generation History ({history.length})</span>
            <span className="text-amber-700">{historyOpen ? "▲" : "▼"}</span>
          </button>

          {historyOpen && (
            <div className="border-t border-amber-900/20">
              {history.map((entry, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); applyScenario(entry); }}
                  className="w-full text-left px-4 py-3 hover:bg-amber-900/10 active:bg-amber-900/20 transition-colors group border-b border-amber-900/10 last:border-b-0"
                  style={{ touchAction: "manipulation" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-sm text-amber-300 group-hover:text-amber-200 truncate">
                      {entry.title}
                    </span>
                    <span className="shrink-0 text-xs font-display px-2 py-0.5 rounded"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#b45309" }}>
                      {entry.difficulty}/20
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/60 mt-0.5 line-clamp-1">{entry.scenario}</p>
                  <p className="text-xs text-amber-900/40 mt-0.5">
                    {entry.ts ? new Date(entry.ts).toLocaleString() : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Base Prize</label>
            <span className="text-sm font-semibold text-amber-400">{safeBasePrizeGen} GEN</span>
          </div>
          <p className="text-xs text-gray-500">
            Minimum 10 GEN. This deposit enters the chapter prize pool and cannot be reclaimed.
          </p>
          <input
            type="number"
            min={MIN_BASE_PRIZE_GEN}
            step={1}
            value={form.base_prize_gen}
            onChange={(e) => {
              const next = Number(e.target.value);
              update("base_prize_gen", Number.isFinite(next) ? Math.max(0, next) : 0);
            }}
            className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
          />
          <div className="p-3 rounded-lg text-xs space-y-1"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex justify-between text-amber-200/60">
              <span>Minimum base prize</span>
              <span className="text-amber-400">{DEFAULT_BASE_PRIZE_GEN} GEN</span>
            </div>
            <div className="flex justify-between text-amber-200/60">
              <span>Difficulty multiplier</span>
              <span className="text-amber-400">{multiplierLabel}</span>
            </div>
            <div className="flex justify-between text-amber-200/80 font-display">
              <span>Required publish deposit</span>
              <span className="text-amber-300">{formatGEN(requiredPublishDepositWei)}</span>
            </div>
          </div>
        </div>

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
              <span>Prize pool (per attempt)</span>
              <span className="text-amber-400">{(form.price_gen * 0.6).toFixed(2)} GEN</span>
            </div>
            <div className="flex justify-between text-amber-200/60">
              <span>Your earnings (per attempt)</span>
              <span className="text-amber-400">{(form.price_gen * 0.3).toFixed(2)} GEN</span>
            </div>
            <div className="flex justify-between text-amber-200/60">
              <span>Protocol (per attempt)</span>
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
          disabled={status === "pending" || !form.title || !form.scenario || !form.win_condition || safeBasePrizeGen < MIN_BASE_PRIZE_GEN}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors"
        >
          {status === "pending" ? "Writing to Genlayer…" : `Publish Chapter · ${formatGEN(requiredPublishDepositWei)}`}
        </button>
      </form>
    </div>
  );
}
