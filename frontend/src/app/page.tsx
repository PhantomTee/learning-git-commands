import { getChapters, Chapter } from "@/lib/genlayer-server";
import ChapterCard from "@/components/ChapterCard";
import WorldMap from "@/components/WorldMap";
import Link from "next/link";

export const revalidate = 30;

export default async function HomePage() {
  let chapters: Chapter[] = [];
  try {
    chapters = await getChapters(0, 50);
  } catch {
    // Contract not deployed yet or RPC unavailable — show empty state
  }

  const activeChapters = chapters.filter((c) => c.active);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">

      {/* ── Hero ── */}
      <div className="text-center space-y-5 pt-4">
        <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl tracking-wider"
          style={{ background: "linear-gradient(180deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          CHAINTALES
        </h1>
        <p className="text-amber-100/80 max-w-xl mx-auto leading-relaxed text-sm sm:text-base font-display tracking-wide">
          Creators write dungeon chapters. Explorers submit actions.<br className="hidden sm:block" />
          The on-chain AI dungeon master decides your fate.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/chapter/create"
            className="btn-gold px-6 py-3 rounded-lg text-sm font-display tracking-wider inline-block text-center">
            Create a Chapter
          </Link>
          <Link href="/character"
            className="btn-stone px-6 py-3 rounded-lg text-sm font-display tracking-wider inline-block text-center">
            My Character
          </Link>
        </div>

        {/* Stats strip */}
        {chapters.length > 0 && (
          <div className="flex justify-center gap-8 pt-2">
            {[
              { label: "Chapters", value: chapters.length },
              { label: "Active", value: activeChapters.length },
              { label: "Attempts", value: chapters.reduce((s, c) => s + c.attempt_count, 0) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="font-display font-bold text-xl text-amber-400">{value}</div>
                <div className="text-xs text-amber-900/60 uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="gold-divider" />

      {/* ── World Map ── */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-amber-400 tracking-widest uppercase text-sm flex items-center gap-3">
          <span className="gold-divider flex-1" />
          World Map
          <span className="gold-divider flex-1" />
        </h2>
        <WorldMap chapters={chapters} />
      </section>

      {/* ── Active Chapter Cards ── */}
      {activeChapters.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display font-bold text-amber-400 tracking-widest uppercase text-sm flex items-center gap-3">
            <span className="gold-divider flex-1" />
            Active Chapters
            <span className="gold-divider flex-1" />
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeChapters.map((ch) => (
              <ChapterCard key={ch.id} chapter={ch} />
            ))}
          </div>
        </section>
      )}

      {chapters.length === 0 && (
        <div className="panel text-center py-16 px-6 space-y-4">
          <p className="font-display text-2xl text-amber-900/30 tracking-widest">CHAINTALES</p>
          <p className="font-display text-amber-400/60 tracking-widest text-sm uppercase">
            The realm awaits its first legend
          </p>
          <Link href="/chapter/create" className="btn-gold px-5 py-2 rounded-lg text-sm inline-block">
            Write the First Chapter
          </Link>
        </div>
      )}
    </div>
  );
}
