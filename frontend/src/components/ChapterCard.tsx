import Link from "next/link";
import { Chapter } from "@/lib/genlayer";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export default function ChapterCard({ chapter }: { chapter: Chapter }) {
  const hasWinner = chapter.fomo_winner !== ZERO_ADDR;

  return (
    <Link
      href={`/chapter/${chapter.id}`}
      className="block border border-gray-800 hover:border-amber-500/50 bg-gray-900 rounded-xl p-5 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-amber-300 group-hover:text-amber-200 leading-tight">
          {chapter.title}
        </h3>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
            chapter.active
              ? "bg-green-900/60 text-green-400"
              : "bg-gray-800 text-gray-500"
          }`}
        >
          {chapter.active ? "Active" : "Closed"}
        </span>
      </div>

      <p className="text-gray-400 text-sm line-clamp-2 mb-3">{chapter.scenario}</p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>🎲 {chapter.attempt_count} attempts</span>
        {hasWinner && (
          <span className="text-amber-400">
            ⚡ FOMO: {chapter.fomo_winner.slice(0, 6)}…{chapter.fomo_winner.slice(-4)}
          </span>
        )}
        <span className="ml-auto font-mono">
          by {chapter.creator.slice(0, 6)}…{chapter.creator.slice(-4)}
        </span>
      </div>
    </Link>
  );
}
