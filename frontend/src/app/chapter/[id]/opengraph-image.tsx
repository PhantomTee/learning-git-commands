import { ImageResponse } from "next/og";
import { formatGEN, getChapter, hasWinner } from "@/lib/genlayer-server";
import { ogBadgeStyle, ogFrameStyle, ogSize } from "../../og-style";

type Params = { id: string };

export const alt = "ChainTales chapter share card";
export const contentType = "image/png";
export const size = ogSize;
export const runtime = "nodejs";

function trimTitle(title: string) {
  return title.length > 44 ? `${title.slice(0, 41)}...` : title;
}

async function resolveParams(params: Params | Promise<Params>) {
  return await params;
}

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const { id } = await resolveParams(params);
  const chapterId = Number(id);

  let title = `Chapter #${id}`;
  let difficulty = "--";
  let prize = "Prize Pool --";
  let state = "Attempt this dungeon";
  let leader = "No current leader";
  let scenario = "A prize-backed dungeon awaits an explorer bold enough to act.";

  if (Number.isFinite(chapterId)) {
    try {
      const chapter = await getChapter(chapterId);
      const winner = hasWinner(chapter);
      title = chapter.title;
      difficulty = `Difficulty ${chapter.difficulty}`;
      prize = `${formatGEN(chapter.prize_pool)} Prize Pool`;
      state = chapter.active ? "Active Chapter" : "Closed Chapter";
      scenario = chapter.scenario.length > 118 ? `${chapter.scenario.slice(0, 115)}...` : chapter.scenario;
      if (winner) {
        const label = chapter.active ? "Current Leader" : "Final Winner";
        leader = `${label}: ${chapter.fomo_winner.explorer.slice(0, 8)}...${chapter.fomo_winner.explorer.slice(-6)}`;
      }
    } catch {
      // Keep fallback card if the RPC is unavailable.
    }
  }

  return new ImageResponse(
    (
      <div style={ogFrameStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={ogBadgeStyle}>{state}</div>
            <div style={{ ...ogBadgeStyle, borderColor: "#dc2626", color: "#fecaca" }}>{difficulty}</div>
          </div>

          <div style={{ fontSize: 104, lineHeight: 0.9, letterSpacing: 4, color: "#fcd34d", textShadow: "7px 7px 0 #000" }}>
            {trimTitle(title)}
          </div>

          <div style={{ display: "flex", gap: 22 }}>
            <div style={{ ...ogBadgeStyle, fontSize: 40 }}>{prize}</div>
            <div style={{ ...ogBadgeStyle, fontSize: 40 }}>{leader}</div>
          </div>

          <div style={{
            display: "flex",
            padding: 28,
            border: "4px solid rgba(245,158,11,0.62)",
            background: "#120d10",
            color: "#e8d9b5",
            fontSize: 42,
            lineHeight: 1.05,
            boxShadow: "8px 8px 0 #000",
          }}>
            {scenario}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 34, color: "#f59e0b" }}>
          <div>PLAY THIS CHAPTER</div>
          <div>CHAINTALES</div>
        </div>
      </div>
    ),
    ogSize
  );
}
