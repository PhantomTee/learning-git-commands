import Link from "next/link";
import { Chapter, hasWinner, formatGEN } from "@/lib/genlayer";

function difficultyColor(d: number) {
  if (d <= 5)  return "text-green-400 border-green-800/60";
  if (d <= 10) return "text-amber-400 border-amber-800/60";
  if (d <= 15) return "text-orange-400 border-orange-800/60";
  return "text-red-400 border-red-800/60";
}

function difficultyLabel(d: number) {
  if (d <= 4)  return "Easy";
  if (d <= 8)  return "Medium";
  if (d <= 12) return "Hard";
  if (d <= 16) return "Deadly";
  return "Legendary";
}

export default function ChapterCard({ chapter }: { chapter: Chapter }) {
  const winner = hasWinner(chapter);
  const fw = chapter.fomo_winner;

  return (
    <Link href={`/chapter/${chapter.id}`}>
      <div className="panel panel-hover h-full flex flex-col cursor-pointer">
        {/* Card header */}
        <div className="p-4 pb-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-bold text-amber-300 group-hover:text-amber-200 leading-snug text-sm line-clamp-2 flex-1">
              {chapter.title}
            </h3>
            <span className={`difficulty-badge shrink-0 ${difficultyColor(chapter.difficulty)}`}>
              {difficultyLabel(chapter.difficulty)}
            </span>
          </div>
          <p className="text-amber-900/60 text-xs font-mono">
            {chapter.active ? (
              <span className="text-green-500">● Active</span>
            ) : (
              <span className="text-gray-600">● Closed</span>
            )}
            {" · "}by {chapter.creator.slice(0, 6)}…{chapter.creator.slice(-4)}
          </p>
        </div>

        <div className="gold-divider mx-4 my-3" />

        {/* Scenario */}
        <div className="px-4 flex-1">
          <p className="text-amber-200/50 text-xs leading-relaxed line-clamp-3">
            {chapter.scenario}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 space-y-2 mt-auto">
          {winner && (
            <div className="flex items-center gap-2 p-2 rounded-lg text-xs"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span>⚡</span>
              <span className="text-amber-400 font-display">FOMO Leader:</span>
              <span className="font-mono text-amber-300">{fw.explorer.slice(0, 6)}…{fw.explorer.slice(-4)}</span>
              <span className="text-amber-700 ml-auto">d{fw.roll}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-amber-900/60">
            <span>🎲 {chapter.attempt_count} attempts</span>
            <span className={`difficulty-badge ${difficultyColor(chapter.difficulty)}`}>
              ⚔ D{chapter.difficulty}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-900/50">
              💰 {formatGEN(chapter.price_per_attempt)} per action
            </span>
            {chapter.prize_pool > 0 && (
              <span className="text-amber-400 font-display font-bold">
                🏆 {formatGEN(chapter.prize_pool)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
