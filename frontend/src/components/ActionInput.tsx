"use client";

import { useState } from "react";
import { Attempt, explorerTxUrl, normaliseError } from "@/lib/genlayer";
import { useToast } from "@/components/Toast";
import type { CharacterGateResult } from "@/hooks/useCharacterGate";

interface Props {
  chapterId: number;
  winCondition: string;
  priceGEN?: string;
  onSubmit: (action: string, account?: string) => Promise<{ attempt: Attempt | null; txHash: string }>;
  beforeSubmit?: () => Promise<CharacterGateResult>;
  disabled?: boolean;
}

export default function ActionInput({ winCondition, priceGEN, onSubmit, beforeSubmit, disabled }: Props) {
  const [action, setAction] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [result, setResult] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action.trim() || status === "pending") return;

    const gate = beforeSubmit ? await beforeSubmit() : undefined;
    if (gate && !gate.ok) return;

    setStatus("pending");
    setError(null);
    setResult(null);
    const tid = toastLoading("The dungeon master deliberates…", "Validators reaching consensus — takes 1–3 min");
    try {
      const { attempt: res, txHash } = await onSubmit(action.trim(), gate?.account);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      dismiss(tid);
      const link = { href: explorerTxUrl(txHash), label: "View transaction" };
      if (res?.success) {
        success(
          "Current Leader",
          "You defeated the chapter and became the current leader. Hold the lead until the chapter closes to claim the pool.",
          link
        );
      } else if (res) {
        toastError("Defeated", res.judgment, link);
      }
      setResult(res);
      setAction("");
      setStatus("done");
    } catch (err: any) {
      dismiss(tid);
      const msg = normaliseError(err).message;
      setError(msg);
      toastError("Action failed", msg);
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-4">
      {/* Win condition */}
      <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <span className="font-display text-xs text-amber-500 tracking-widest uppercase">Victory Condition — </span>
        <span className="text-amber-200/70 text-xs">{winCondition}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Describe your action… be bold, be clever. The dungeon master watches."
            rows={4}
            maxLength={500}
            disabled={disabled || status === "pending"}
            className="input-stone w-full px-4 py-3 text-sm resize-none disabled:opacity-50"
          />
          <div className="absolute bottom-2 right-3 text-xs text-amber-900/40">{action.length}/500</div>
        </div>

        <button
          type="submit"
          disabled={!action.trim() || disabled || status === "pending"}
          className="btn-gold w-full py-3 rounded-lg text-sm font-display tracking-wider"
        >
          {status === "pending" ? "The dungeon master deliberates…" : `Submit Action${priceGEN ? ` · ${priceGEN}` : ""}`}
        </button>
      </form>

      {status === "pending" && (
        <div className="text-center py-3">
          <div className="inline-flex items-center gap-2 text-xs text-amber-400/60 font-display tracking-widest animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Validators reaching consensus — this takes 1–3 minutes…
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          </div>
        </div>
      )}

      {result && (
        <div className="panel overflow-hidden">
          <div className={`h-1 ${result.success ? "bg-green-500" : "bg-red-600"}`} />
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xl font-display font-black" style={{ color: result.success ? "#4ade80" : "#f87171" }}>{result.success ? "✓" : "✕"}</span>
              <div>
                <div className="font-display font-bold text-sm" style={{ color: result.success ? "#4ade80" : "#f87171" }}>
                  {result.success ? "Current Leader" : "Defeated"}
                </div>
                <div className="text-xs text-amber-900/60 font-display">
                  d20 rolled: <span className="text-amber-400 font-bold">{result.roll}</span>
                </div>
              </div>
            </div>
            <div className="gold-divider" />
            <p className="text-sm text-amber-200/70 italic leading-relaxed">"{result.judgment}"</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg text-sm text-red-400 font-display"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
