"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Chapter, hasWinner } from "@/lib/genlayer";
import Link from "next/link";

interface Player {
  address: string;
  name: string;
  character_class: string;
  x: number;
  y: number;
  status: string;
}

interface Props {
  chapters: Chapter[];
}

const CLASS_ICONS: Record<string, string> = {
  Warrior: "⚔️", Mage: "🔮", Rogue: "🗡️",
  Ranger: "🏹", Bard: "🎵", Cleric: "✨",
};

function difficultyColor(d: number) {
  if (d <= 5)  return "text-green-400 border-green-800";
  if (d <= 10) return "text-amber-400 border-amber-800";
  if (d <= 15) return "text-orange-400 border-orange-800";
  return "text-red-400 border-red-800";
}

function difficultyLabel(d: number) {
  if (d <= 4)  return "Easy";
  if (d <= 8)  return "Medium";
  if (d <= 12) return "Hard";
  if (d <= 16) return "Deadly";
  return "Legendary";
}

export default function WorldMap({ chapters }: Props) {
  const players = (useQuery(api.world.getActivePlayers) ?? []) as Player[];

  // Group players by chapter (by position slot)
  const playersBySlot: Record<number, Player[]> = {};
  players.forEach((p) => {
    const slot = (p.x + p.y * 10) % 100;
    playersBySlot[slot] = playersBySlot[slot] ?? [];
    playersBySlot[slot].push(p);
  });

  const activeChapters = chapters.filter((c) => c.active);
  const closedChapters = chapters.filter((c) => !c.active);

  if (chapters.length === 0) {
    return (
      <div className="map-bg rounded-xl border border-amber-900/30 p-12 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <p className="font-display text-amber-400/60 tracking-widest text-sm uppercase">
          No chapters discovered yet
        </p>
        <p className="text-amber-900/60 text-xs mt-2">Be the first to write a chapter and mark your territory</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map container */}
      <div className="map-bg rounded-xl border border-amber-900/40 p-4 sm:p-6"
        style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.5)" }}>

        {/* Map header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <h3 className="font-display text-amber-400 font-bold tracking-widest text-sm uppercase">
                Realm of ChainTales
              </h3>
              <p className="text-amber-900/70 text-xs">
                {activeChapters.length} active · {closedChapters.length} closed · {players.length} adventurers online
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-amber-900/60">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600" />Closed</span>
          </div>
        </div>

        <div className="gold-divider mb-5" />

        {/* Active chapter locations */}
        {activeChapters.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeChapters.map((ch) => {
              const fw = hasWinner(ch) ? ch.fomo_winner : null;
              const chapterPlayers = playersBySlot[ch.id % 100] ?? [];
              return (
                <Link key={ch.id} href={`/chapter/${ch.id}`}>
                  <div className="group relative panel panel-hover p-4 cursor-pointer"
                    style={{ border: "1px solid rgba(245,158,11,0.3)" }}>
                    {/* Glow dot */}
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.8)]" />

                    {/* Location pin header */}
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-2xl shrink-0">🏰</span>
                      <div className="min-w-0">
                        <h4 className="font-display font-bold text-amber-300 text-sm leading-snug group-hover:text-amber-200 transition-colors line-clamp-1">
                          {ch.title}
                        </h4>
                        <p className="text-amber-900/60 text-xs font-mono mt-0.5">
                          by {ch.creator.slice(0, 6)}…{ch.creator.slice(-4)}
                        </p>
                      </div>
                    </div>

                    <p className="text-amber-200/50 text-xs leading-relaxed line-clamp-2 mb-3">
                      {ch.scenario}
                    </p>

                    {/* Stats row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`difficulty-badge ${difficultyColor(ch.difficulty)}`}>
                        ⚔ D{ch.difficulty} · {difficultyLabel(ch.difficulty)}
                      </span>
                      <span className="text-xs text-amber-900/60">🎲 {ch.attempt_count} attempts</span>
                      {fw && (
                        <span className="text-xs text-amber-400">
                          ⚡ {fw.explorer.slice(0, 6)}…
                        </span>
                      )}
                    </div>

                    {/* Online players */}
                    {chapterPlayers.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5">
                        {chapterPlayers.slice(0, 4).map((p) => (
                          <span key={p.address} title={p.name} className="text-base"
                            style={{ filter: "drop-shadow(0 0 4px rgba(245,158,11,0.5))" }}>
                            {CLASS_ICONS[p.character_class] ?? "🧙"}
                          </span>
                        ))}
                        {chapterPlayers.length > 4 && (
                          <span className="text-xs text-amber-900/60">+{chapterPlayers.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Closed chapters (collapsed) */}
        {closedChapters.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-amber-900/50 font-display tracking-widest uppercase mb-2">
              Fallen Dungeons
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {closedChapters.map((ch) => (
                <Link key={ch.id} href={`/chapter/${ch.id}`}>
                  <div className="panel p-3 opacity-50 hover:opacity-70 transition-opacity cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏚️</span>
                      <span className="font-display text-xs text-gray-400 line-clamp-1">{ch.title}</span>
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
