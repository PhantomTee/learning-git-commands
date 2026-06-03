import { getChapters, Chapter } from "@/lib/genlayer";
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
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-amber-400">ChainTales</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          AI-judged DND adventures on Genlayer. Creators write chapters,
          Explorers submit actions — the on-chain dungeon master decides your fate.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/chapter/create"
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Create a Chapter
          </Link>
          <Link
            href="/character"
            className="border border-gray-700 hover:border-amber-500 px-5 py-2 rounded-lg transition-colors"
          >
            My Character
          </Link>
        </div>
      </div>

      {/* World Map */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-200">
          🗺 World Map — {activeChapters.length} active chapters
        </h2>
        <WorldMap chapters={chapters} />
      </section>

      {/* Chapter list */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-200">
          Active Chapters
        </h2>
        {activeChapters.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeChapters.map((ch) => (
              <ChapterCard key={ch.id} chapter={ch} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-600">
            <p className="text-5xl mb-4">🏰</p>
            <p>No chapters yet. Be the first creator.</p>
          </div>
        )}
      </section>
    </div>
  );
}
