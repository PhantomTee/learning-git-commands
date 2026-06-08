"use client";

import { Chapter, hasWinner, formatGEN } from "@/lib/genlayer-server";
import Link from "next/link";

interface Props {
  chapters: Chapter[];
}

function difficultyColor(d: number) {
  if (d <= 5)  return { color: "#4ade80", border: "rgba(74,222,128,0.4)" };
  if (d <= 10) return { color: "#fbbf24", border: "rgba(251,191,36,0.4)" };
  if (d <= 15) return { color: "#fb923c", border: "rgba(251,146,60,0.4)" };
  return       { color: "#f87171", border: "rgba(248,113,113,0.4)" };
}

function difficultyLabel(d: number) {
  if (d <= 4)  return "Easy";
  if (d <= 8)  return "Medium";
  if (d <= 12) return "Hard";
  if (d <= 16) return "Deadly";
  return "Legendary";
}

export default function WorldMap({ chapters }: Props) {
  const activeChapters  = chapters.filter((c) => c.active);
  const closedChapters  = chapters.filter((c) => !c.active);

  if (chapters.length === 0) {
    return (
      <div className="map-bg rounded-xl border border-amber-900/30 p-12 text-center">
        <p className="font-display text-amber-400 tracking-widest text-sm uppercase mb-2">
          No chapters discovered yet
        </p>
        <p className="text-amber-200/70 text-xs">
          Be the first to write a chapter and mark your territory
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="map-bg rounded-xl border border-amber-900/40 p-4 sm:p-6"
        style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-display text-amber-400 font-bold tracking-widest text-sm uppercase">
                Realm of ChainTales
              </h3>
              <p className="text-amber-300/70 text-xs mt-0.5">
                {activeChapters.length} active · {closedChapters.length} closed
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-amber-300/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-500" />Closed
            </span>
          </div>
        </div>

        <div className="gold-divider mb-5" />

        {/* Active chapters */}
        {activeChapters.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeChapters.map((ch) => {
              const fw  = hasWinner(ch) ? ch.fomo_winner : null;
              const dc  = difficultyColor(ch.difficulty);
              return (
                <Link key={ch.id} href={`/chapter/${ch.id}`}>
                  <div className="group relative panel panel-hover p-4 cursor-pointer"
                    style={{ border: "1px solid rgba(245,158,11,0.3)" }}>

                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                      style={{ boxShadow: "0 0 6px rgba(245,158,11,0.8)" }} />

                    <div className="flex items-start gap-3 mb-2">
                      <div className="min-w-0">
                        <h4 className="font-display font-bold text-amber-300 text-sm leading-snug group-hover:text-amber-100 transition-colors line-clamp-1">
                          {ch.title}
                        </h4>
                        <p className="text-amber-400/60 text-xs font-mono mt-0.5">
                          by {ch.creator.slice(0, 6)}…{ch.creator.slice(-4)}
                        </p>
                      </div>
                    </div>

                    <p className="text-amber-100/65 text-xs leading-relaxed line-clamp-2 mb-3">
                      {ch.scenario}
                    </p>

                    <div className="space-y-1 text-xs">
                      <span className="text-xs px-2 py-0.5 rounded-full font-display"
                        style={{ color: dc.color, border: `1px solid ${dc.border}`, background: `${dc.border.replace("0.4","0.08")}` }}>
                        D{ch.difficulty} · {difficultyLabel(ch.difficulty)}
                      </span>
                      <div className="flex items-center justify-between gap-3 text-amber-200/60">
                        <span>Prize Pool</span>
                        <span className="text-amber-300 font-bold">{formatGEN(ch.prize_pool)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-amber-200/60">
                        <span>Attempt Fee</span>
                        <span className="text-amber-400/80">{formatGEN(ch.price_per_attempt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-amber-200/60">
                        <span>Attempts</span>
                        <span>{ch.attempt_count}</span>
                      </div>
                      {fw && (
                        <div className="flex items-center justify-between gap-3 text-amber-200/60">
                          <span>Current Leader</span>
                          <span className="text-amber-300">{fw.explorer.slice(0, 6)}…{fw.explorer.slice(-4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Closed chapters */}
        {closedChapters.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-amber-400/70 font-display tracking-widest uppercase mb-3">
              Fallen Dungeons
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {closedChapters.map((ch) => (
                <Link key={ch.id} href={`/chapter/${ch.id}`}>
                  <div className="panel p-3 opacity-60 hover:opacity-90 transition-opacity cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs text-amber-200/80 line-clamp-1">{ch.title}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
