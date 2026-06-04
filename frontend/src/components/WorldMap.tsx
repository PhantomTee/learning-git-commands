"use client";

import { useQuery } from "convex/react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from "../../convex/_generated/api";
import { Chapter } from "@/lib/genlayer";
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

// 10×10 grid — chapters occupy cells, players roam
export default function WorldMap({ chapters }: Props) {
  const players = (useQuery(api.world.getActivePlayers) ?? []) as Player[];

  // Map chapters to grid slots (wrap by chapter id)
  const chapterSlots: Record<number, Chapter> = {};
  chapters.forEach((ch) => {
    chapterSlots[ch.id % 100] = ch;
  });

  // Map players to grid positions
  const playerSlots: Record<string, Player[]> = {};
  players.forEach((p) => {
    const key = `${p.x},${p.y}`;
    playerSlots[key] = playerSlots[key] ?? [];
    playerSlots[key].push(p);
  });

  const cells = Array.from({ length: 100 }, (_, i) => i);

  return (
    <div className="overflow-auto">
      <div className="grid grid-cols-10 gap-1 min-w-[560px]">
        {cells.map((slot) => {
          const chapter = chapterSlots[slot];
          const [cx, cy] = [slot % 10, Math.floor(slot / 10)];
          const playersHere = playerSlots[`${cx},${cy}`] ?? [];

          return (
            <div
              key={slot}
              className={`relative aspect-square rounded border text-xs flex flex-col items-center justify-center p-1 transition-colors ${
                chapter
                  ? chapter.active
                    ? "border-amber-500/60 bg-amber-950/40 hover:bg-amber-900/40 cursor-pointer"
                    : "border-gray-700 bg-gray-900 opacity-50"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              {chapter ? (
                <Link href={`/chapter/${chapter.id}`} className="absolute inset-0 flex flex-col items-center justify-center p-1 gap-0.5">
                  <span className="text-lg">🏰</span>
                  <span className="text-amber-300 text-center leading-tight font-medium line-clamp-2">
                    {chapter.title}
                  </span>
                  <span className="text-gray-500">{chapter.attempt_count} attempts</span>
                </Link>
              ) : (
                <span className="text-gray-700 text-base">·</span>
              )}

              {playersHere.length > 0 && (
                <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                  {playersHere.slice(0, 3).map((p) => (
                    <span key={p.address} title={p.name} className="text-base">
                      {p.status === "exploring" ? "⚔" : "🧙"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
