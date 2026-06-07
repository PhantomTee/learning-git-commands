import { ImageResponse } from "next/og";
import { ogBadgeStyle, ogFrameStyle, ogSize } from "./og-style";

export const alt = "ChainTales pixel RPG title card";
export const contentType = "image/png";
export const size = ogSize;
export const runtime = "nodejs";

export default function Image() {
  return new ImageResponse(
    (
      <div style={ogFrameStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={ogBadgeStyle}>GenLayer On-Chain RPG</div>
            <div style={{ fontSize: 138, lineHeight: 0.9, letterSpacing: 6, textShadow: "8px 8px 0 #000" }}>
              CHAINTALES
            </div>
            <div style={{ maxWidth: 760, color: "#e8d9b5", fontSize: 44, lineHeight: 1.1 }}>
              Write prize-backed chapters. Attempt dungeons. Let the AI dungeon master judge your action.
            </div>
          </div>

          <div style={{ width: 190, height: 190, display: "flex", position: "relative" }}>
            <div style={{ position: "absolute", left: 82, top: 12, width: 28, height: 120, background: "#fcd34d" }} />
            <div style={{ position: "absolute", left: 58, top: 58, width: 76, height: 28, background: "#f59e0b" }} />
            <div style={{ position: "absolute", left: 42, top: 86, width: 108, height: 20, background: "#d97706" }} />
            <div style={{ position: "absolute", left: 88, top: 132, width: 16, height: 34, background: "#92400e" }} />
            <div style={{ position: "absolute", left: 62, top: 166, width: 68, height: 14, background: "#f59e0b" }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 34, color: "#f59e0b" }}>
          <div>16-BIT FANTASY MENU</div>
          <div>CHAINTALES</div>
        </div>
      </div>
    ),
    ogSize
  );
}
