import { getLeaderboard, getChapters, LeaderboardEntry, Chapter, formatGEN } from "@/lib/genlayer-server";
import Link from "next/link";

export const revalidate = 30;

export default async function LeaderboardPage() {
  let entries: LeaderboardEntry[] = [];
  let chapters: Chapter[] = [];

  try {
    [entries, chapters] = await Promise.all([
      getLeaderboard(),
      getChapters(0, 50),
    ]);
  } catch { /* RPC unavailable */ }

  const chapterMap: Record<number, Chapter> = {};
  chapters.forEach((c) => { chapterMap[c.id] = c; });

  const ranked = entries.slice().sort((a, b) => b.roll - a.roll);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-widest"
          style={{ background: "linear-gradient(180deg,#fcd34d 0%,#f59e0b 60%,#d97706 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          HALL OF LEGENDS
        </h1>
        <p className="text-amber-200/50 text-sm font-display tracking-wide">
          Current leaders for active chapters and final winners for closed chapters
        </p>
      </div>

      <div className="gold-divider" />

      {ranked.length === 0 ? (
        <div className="panel text-center py-16 space-y-4">
          <p className="font-display text-sm text-amber-900/40 tracking-widest uppercase">—</p>
          <p className="font-display text-amber-400/50 tracking-widest text-sm uppercase">
            No legends yet
          </p>
          <Link href="/" className="btn-gold px-5 py-2 rounded-lg text-xs inline-block">
            Be the first
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map((entry, i) => {
            const chapter = chapterMap[entry.chapter_id];
            const medal = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i + 1}`;
            const hasPrize = entry.prize_pool > 0;

            return (
              <Link key={entry.chapter_id} href={`/chapter/${entry.chapter_id}`}>
                <div className={`panel panel-hover p-4 flex items-center gap-4 cursor-pointer ${i < 3 ? "border-amber-500/30" : ""}`}
                  style={i < 3 ? { border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.04)" } : {}}>

                  {/* Rank */}
                  <div className="w-10 text-center shrink-0">
                    <span className="font-display font-bold text-sm text-amber-400">{medal}</span>
                  </div>

                  {/* Chapter info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-amber-300 text-sm truncate">
                        {chapter?.title ?? `Chapter #${entry.chapter_id}`}
                      </h3>
                      {chapter && !chapter.active && (
                        <span className="text-xs text-gray-500 font-display">(Closed)</span>
                      )}
                    </div>
                    <p className="text-xs text-amber-900/60 font-mono mt-0.5">
                      {entry.explorer.slice(0, 10)}…{entry.explorer.slice(-8)}
                    </p>
                  </div>

                  {/* Roll */}
                  <div className="text-center shrink-0">
                    <div className="font-display font-black text-lg text-amber-400">{entry.roll}</div>
                    <div className="text-xs text-amber-900/60 uppercase tracking-widest">d20</div>
                  </div>

                  {/* Prize */}
                  <div className="text-right shrink-0 min-w-[80px]">
                    {hasPrize ? (
                      <>
                        <div className="font-display font-bold text-sm text-amber-300">
                          {formatGEN(entry.prize_pool)}
                        </div>
                        <div className="text-xs font-display">
                          {entry.prize_claimed
                            ? <span className="text-green-500/70">Claimed</span>
                            : <span className="text-amber-500 animate-pulse">Unclaimed</span>}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-amber-900/40 font-display">—</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Summary strip */}
      {ranked.length > 0 && (
        <div className="panel p-4 grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Leaders", value: ranked.length },
            { label: "Final Pools", value: formatGEN(ranked.reduce((s, e) => s + e.prize_pool, 0)) },
            { label: "Claimed", value: ranked.filter((e) => e.prize_claimed).length },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="font-display font-bold text-amber-400">{value}</div>
              <div className="text-xs text-amber-900/60 uppercase tracking-widest font-display">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
