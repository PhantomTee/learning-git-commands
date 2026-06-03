"use client";

import { useState } from "react";
import { Attempt } from "@/lib/genlayer";

interface Props {
  winCondition: string;
  onSubmit: (action: string) => Promise<Attempt | null>;
  disabled?: boolean;
}

export default function ActionInput({ winCondition, onSubmit, disabled }: Props) {
  const [action, setAction] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [result, setResult] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action.trim() || status === "pending") return;
    setStatus("pending");
    setError(null);
    setResult(null);
    try {
      const res = await onSubmit(action.trim());
      setResult(res);
      setAction("");
      setStatus("done");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
        <span className="text-amber-400 font-medium">Win condition: </span>
        {winCondition}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Describe your action… be creative, the dungeon master is watching."
          rows={4}
          maxLength={500}
          disabled={disabled || status === "pending"}
          className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-3 text-sm resize-none outline-none placeholder:text-gray-600 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!action.trim() || disabled || status === "pending"}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg transition-colors"
        >
          {status === "pending" ? "⏳ The dungeon master deliberates…" : "Submit Action (1 Prompt)"}
        </button>
      </form>

      {status === "pending" && (
        <div className="text-center text-sm text-gray-400 animate-pulse">
          Genlayer validators are reaching consensus on your fate…
        </div>
      )}

      {result && (
        <div
          className={`rounded-xl border p-4 space-y-2 ${
            result.success
              ? "border-green-500/40 bg-green-950/30"
              : "border-red-500/40 bg-red-950/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{result.success ? "✅" : "💀"}</span>
            <div>
              <div className="font-semibold">
                {result.success ? "Success!" : "Failure"}
              </div>
              <div className="text-xs text-gray-400">d20 roll: {result.roll}</div>
            </div>
          </div>
          <p className="text-sm text-gray-300 italic">"{result.judgment}"</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
