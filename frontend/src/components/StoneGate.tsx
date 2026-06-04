"use client";

import { useEffect, useState } from "react";

type Phase = "closed" | "reveal" | "opening" | "gone";

// Horizontal mortar lines — percent positions on each panel
const MORTAR = [7, 14, 23, 31, 38, 47, 56, 62, 71, 79, 86, 93];

export default function StoneGate() {
  const [phase, setPhase] = useState<Phase>("closed");

  useEffect(() => {
    // Only show on first visit per session.
    // Mark immediately so any re-mount (e.g. fast navigation) skips the gate.
    if (sessionStorage.getItem("ct_gate")) {
      setPhase("gone");
      return;
    }
    sessionStorage.setItem("ct_gate", "1");

    const t1 = setTimeout(() => setPhase("reveal"),  120);
    const t2 = setTimeout(() => setPhase("opening"), 1800);
    const t3 = setTimeout(() => setPhase("gone"),    2900);

    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  if (phase === "gone") return null;

  const isOpening = phase === "opening";
  const logoVisible = phase === "reveal" || phase === "opening";

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden"
      style={{ pointerEvents: isOpening ? "none" : "all" }}
    >
      <GatePanel side="left"  isOpening={isOpening} />
      <GatePanel side="right" isOpening={isOpening} />
      <GateLogo visible={logoVisible} fading={isOpening} />
    </div>
  );
}

/* ── Stone panel ─────────────────────────────────────────────────────────── */

function GatePanel({ side, isOpening }: { side: "left" | "right"; isOpening: boolean }) {
  const left = side === "left";

  return (
    <div
      className="absolute top-0 bottom-0"
      style={{
        left:  left ? 0    : "50%",
        right: left ? "50%": 0,
        willChange: "transform",
        transform:  isOpening ? `translateX(${left ? "-100%" : "100%"})` : "translateX(0)",
        transition: "transform 0.95s cubic-bezier(0.86, 0, 0.07, 1)",
      }}
    >
      {/* Base stone gradient */}
      <div className="absolute inset-0" style={{
        background: left
          ? "linear-gradient(to right, #060408 0%, #100c0e 35%, #181218 65%, #1e1620 100%)"
          : "linear-gradient(to left,  #060408 0%, #100c0e 35%, #181218 65%, #1e1620 100%)",
      }} />

      {/* Depth shadow — darkens the outer edge */}
      <div className="absolute inset-0" style={{
        background: left
          ? "linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 40%)"
          : "linear-gradient(to left,  rgba(0,0,0,0.7) 0%, transparent 40%)",
      }} />

      {/* Warm amber glow radiating from the seam */}
      <div className="absolute inset-0" style={{
        background: left
          ? "radial-gradient(ellipse at 100% 50%, rgba(245,158,11,0.07) 0%, transparent 55%)"
          : "radial-gradient(ellipse at 0%   50%, rgba(245,158,11,0.07) 0%, transparent 55%)",
      }} />

      {/* Horizontal mortar lines — stone block texture */}
      {MORTAR.map((pos) => (
        <div key={pos} className="absolute left-0 right-0" style={{
          top: `${pos}%`,
          height: 1,
          background: "rgba(0,0,0,0.55)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.025)",
        }} />
      ))}

      {/* Vertical crack lines for detail */}
      {(left ? [30, 65] : [35, 70]).map((pct) => (
        <div key={pct} className="absolute top-0 bottom-0" style={{
          left: `${pct}%`,
          width: 1,
          background: "rgba(0,0,0,0.3)",
          boxShadow: "1px 0 0 rgba(255,255,255,0.015)",
        }} />
      ))}

      {/* Seam — the inner edge where the two doors meet */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          [left ? "right" : "left"]: 0,
          width: 3,
          background: "linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.6) 15%, rgba(252,211,77,0.9) 50%, rgba(245,158,11,0.6) 85%, transparent 100%)",
          boxShadow: left
            ? "0 0 12px rgba(245,158,11,0.4), 0 0 30px rgba(245,158,11,0.15)"
            : "0 0 12px rgba(245,158,11,0.4), 0 0 30px rgba(245,158,11,0.15)",
        }}
      />

      {/* Top chain brace */}
      <ChainBrace position="top" left={left} />

      {/* Bottom chain brace */}
      <ChainBrace position="bottom" left={left} />

      {/* Decorative horizontal banding at 1/4 and 3/4 */}
      {[25, 75].map((pct) => (
        <div key={pct} className="absolute left-0 right-0 flex items-center" style={{ top: `${pct}%` }}>
          <div style={{
            flex: 1,
            height: 6,
            background: left
              ? "linear-gradient(to right, rgba(0,0,0,0.5), rgba(245,158,11,0.08), rgba(0,0,0,0.3))"
              : "linear-gradient(to left,  rgba(0,0,0,0.5), rgba(245,158,11,0.08), rgba(0,0,0,0.3))",
            borderTop:    "1px solid rgba(0,0,0,0.5)",
            borderBottom: "1px solid rgba(255,255,255,0.025)",
          }} />
        </div>
      ))}
    </div>
  );
}

/* ── Chain brace decoration ──────────────────────────────────────────────── */

function ChainBrace({ position, left }: { position: "top" | "bottom"; left: boolean }) {
  const isTop = position === "top";
  return (
    <div
      className="absolute left-0 right-0 flex justify-center"
      style={{ [isTop ? "top" : "bottom"]: 0 }}
    >
      {/* Vertical chain link going off-screen */}
      <div style={{
        width: 6,
        height: 48,
        background: `linear-gradient(${isTop ? "180deg" : "0deg"}, rgba(180,120,20,0.8) 0%, rgba(120,80,10,0.4) 100%)`,
        boxShadow: "0 0 6px rgba(245,158,11,0.2)",
      }} />
    </div>
  );
}

/* ── Centred logo ────────────────────────────────────────────────────────── */

function GateLogo({ visible, fading }: { visible: boolean; fading: boolean }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center select-none"
      style={{
        pointerEvents: "none",
        opacity: fading ? 0 : visible ? 1 : 0,
        transition: fading
          ? "opacity 0.35s ease"
          : "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
      }}
    >
      {/* Top rule */}
      <Ornament />

      <div className="my-5 text-center px-8 space-y-3">
        {/* Title */}
        <h1
          className="font-display font-black tracking-[0.18em] text-4xl sm:text-6xl"
          style={{
            background: "linear-gradient(180deg,#fef3c7 0%,#fcd34d 20%,#f59e0b 55%,#d97706 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 12px rgba(245,158,11,0.5))",
          }}
        >
          CHAINTALES
        </h1>

        {/* Tagline */}
        <p
          className="font-display text-xs tracking-[0.45em] uppercase"
          style={{ color: "rgba(168,152,120,0.65)" }}
        >
          Enter the Realm
        </p>
      </div>

      {/* Bottom rule */}
      <Ornament />
    </div>
  );
}

/* ── Decorative horizontal ornament ─────────────────────────────────────── */

function Ornament() {
  return (
    <div className="flex items-center gap-3" style={{ width: 260 }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(245,158,11,0.55))" }} />
      <span className="text-amber-500/70 text-xs">✦</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(245,158,11,0.55))" }} />
    </div>
  );
}
