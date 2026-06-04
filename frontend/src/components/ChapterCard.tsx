import Link from "next/link";
import { Chapter, hasWinner, formatGEN } from "@/lib/genlayer";

function difficultyColor(d: number) {
  if (d <= 5)  return { color: "#4ade80", border: "rgba(74,222,128,0.4)"  };
  if (d <= 10) return { color: "#fbbf24", border: "rgba(251,191,36,0.4)"  };
  if (d <= 15) return { color: "#fb923c", border: "rgba(251,146,60,0.4)"  };
  return       { color: "#f87171", border: "rgba(248,113,113,0.4)" };
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
  const fw     = chapter.fomo_winner;
  const dc     = difficultyColor(chapter.difficulty);

  return (
    <Link href={`/chapter/${chapter.id}`}>
      <div className="panel panel-hover h-full flex flex-col cursor-pointer group">

        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-bold text-amber-300 group-hover:text-amber-100 leading-snug text-sm line-clamp-2 flex-1 transition-colors">
              {chapter.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-display shrink-0"
              style={{ color: dc.color, border: `1px solid ${dc.border}`, background: `${dc.border.replace("0.4","0.08")}` }}>
              {difficultyLabel(chapter.difficulty)}
            </span>
          </div>
          <p className="text-xs font-mono text-amber-400/70">
            {chapter.active
              ? <span className="text-green-400">● Active</span>
              : <span className="text-gray-400">● Closed</span>}
            {" · "}by {chapter.creator.slice(0, 6)}…{chapter.creator.slice(-4)}
          </p>
        </div>

        <div className="gold-divider mx-4 my-3" />

        {/* Scenario */}
        <div className="px-4 flex-1">
          <p className="text-amber-100/70 text-xs leading-relaxed line-clamp-3">
            {chapter.scenario}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 space-y-2 mt-auto">
          {winner && (
            <div className="flex items-center gap-2 p-2 rounded-lg text-xs"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <span>⚡</span>
              <span className="text-amber-400 font-display">FOMO Leader:</span>
              <span className="font-mono text-amber-200">{fw.explorer.slice(0, 6)}…{fw.explorer.slice(-4)}</span>
              <span className="text-amber-500/80 ml-auto">d{fw.roll}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-amber-300/70">
            <span>🎲 {chapter.attempt_count} attempts</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ color: dc.color, border: `1px solid ${dc.border}`, background: `${dc.border.replace("0.4","0.06")}` }}>
              ⚔ D{chapter.difficulty}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-300/60">💰 {formatGEN(chapter.price_per_attempt)} per action</span>
            {chapter.prize_pool > 0 && (
              <span className="text-amber-300 font-display font-bold">🏆 {formatGEN(chapter.prize_pool)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
