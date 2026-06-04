"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getChapter,
  getAttempts,
  submitAction,
  waitForResult,
  createWriteClient,
  hasWinner,
  Chapter,
  Attempt,
} from "@/lib/genlayer";
import ActionInput from "@/components/ActionInput";
import Link from "next/link";

export default function ChapterPage() {
  const params = useParams();
  const chapterId = Number(params.id);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAttempts(id: number) {
    return getAttempts(id, 0, 50);
  }

  useEffect(() => {
    async function load() {
      try {
        const [ch, atts] = await Promise.all([
          getChapter(chapterId),
          loadAttempts(chapterId),
        ]);
        setChapter(ch);
        setAttempts(atts);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    }
    load();

    const eth = (window as any).ethereum;
    if (eth) {
      eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
        if (accs[0]) setWalletAddress(accs[0]);
      });
    }
  }, [chapterId]);

  async function handleAction(action: string): Promise<Attempt | null> {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("Install MetaMask to submit actions");

    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setWalletAddress(accounts[0]);
    const writeClient = createWriteClient(accounts[0] as `0x${string}`);
    await writeClient.connect("studionet").catch(() => {});

    const txHash = await submitAction(writeClient, chapterId, action);
    await waitForResult(txHash);

    const [updatedCh, updatedAttempts] = await Promise.all([
      getChapter(chapterId),
      loadAttempts(chapterId),
    ]);
    setChapter(updatedCh);
    setAttempts(updatedAttempts);

    return updatedAttempts[updatedAttempts.length - 1] ?? null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading chapter…
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Chapter not found.</p>
        <Link href="/" className="text-amber-400 hover:underline text-sm mt-2 block">
          Back to world map
        </Link>
      </div>
    );
  }

  const winner = hasWinner(chapter);
  const fw = chapter.fomo_winner;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/" className="text-xs text-gray-500 hover:text-amber-400">
          ← World Map
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-amber-400">{chapter.title}</h1>
          <span
            className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
              chapter.active
                ? "bg-green-900/60 text-green-400"
                : "bg-gray-800 text-gray-500"
            }`}
          >
            {chapter.active ? "Active" : "Closed"}
          </span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Creator: {chapter.creator.slice(0, 8)}…{chapter.creator.slice(-6)} ·{" "}
          {chapter.attempt_count} attempts · Difficulty {chapter.difficulty}/20
        </div>
      </div>

      {/* Scenario */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Scenario
        </h2>
        <p className="text-gray-300 leading-relaxed">{chapter.scenario}</p>
        <div className="pt-1 text-xs text-gray-500 border-t border-gray-800">
          Win condition: {chapter.win_condition}
        </div>
      </div>

      {/* FOMO winner banner */}
      {winner && (
        <div className="border border-amber-500/40 bg-amber-950/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="font-semibold text-amber-400">FOMO Leader</div>
            <div className="text-sm text-gray-400">
              {fw.explorer.slice(0, 8)}…{fw.explorer.slice(-6)}
              <span className="ml-2 text-amber-300/70">rolled {fw.roll}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action submission */}
      {chapter.active && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Submit Your Action
          </h2>
          {!walletAddress && (
            <p className="text-xs text-gray-500">
              Connect your wallet to play. You need 1 Prompt token per action.
              Max 3 attempts per chapter.
            </p>
          )}
          <ActionInput
            chapterId={chapterId}
            winCondition={chapter.win_condition}
            onSubmit={handleAction}
            disabled={!chapter.active}
          />
        </div>
      )}

      {/* Attempts log */}
      {attempts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Explorer Log ({attempts.length})
          </h2>
          <div className="space-y-3">
            {[...attempts].reverse().map((att, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 space-y-1.5 ${
                  att.success
                    ? "border-green-800/50 bg-green-950/20"
                    : "border-gray-800 bg-gray-900/50"
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={att.success ? "text-green-400" : "text-red-400"}>
                    {att.success ? "✓ Success" : "✗ Fail"}
                  </span>
                  <span>·</span>
                  <span>d20: {att.roll}</span>
                  <span>·</span>
                  <span className="font-mono">
                    {att.explorer.slice(0, 6)}…{att.explorer.slice(-4)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 italic">"{att.action}"</p>
                <p className="text-sm text-gray-300">{att.judgment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
