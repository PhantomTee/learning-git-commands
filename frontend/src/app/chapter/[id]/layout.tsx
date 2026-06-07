import type { Metadata } from "next";
import { formatGEN, getChapter, hasWinner } from "@/lib/genlayer-server";

type Params = { id: string };

async function resolveParams(params: Params | Promise<Params>) {
  return await params;
}

export async function generateMetadata({ params }: { params: Params | Promise<Params> }): Promise<Metadata> {
  const { id } = await resolveParams(params);
  const chapterId = Number(id);
  let title = `Chapter #${id}`;
  let description = "Attempt this ChainTales chapter in an AI-judged on-chain RPG.";

  if (Number.isFinite(chapterId)) {
    try {
      const chapter = await getChapter(chapterId);
      const leaderLabel = hasWinner(chapter)
        ? chapter.active ? "Current leader set" : "Final winner set"
        : "No leader yet";
      title = `${chapter.title} | ChainTales`;
      description = `Difficulty ${chapter.difficulty}. Prize pool ${formatGEN(chapter.prize_pool)}. ${leaderLabel}.`;
    } catch {
      // Keep fallback metadata if the RPC is unavailable.
    }
  }

  const imageUrl = `/chapter/${id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "ChainTales",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
