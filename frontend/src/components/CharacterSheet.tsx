import { Character } from "@/lib/genlayer";

const CLASS_COLOR: Record<string, string> = {
  Warrior: "#ef4444", Mage: "#8b5cf6", Rogue: "#6b7280",
  Ranger: "#22c55e",  Bard:  "#ec4899", Cleric: "#f59e0b",
};

function StatBar({ label, value, max = 20, color }: { label: string; value: number; max?: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-display tracking-wider text-amber-200/70 uppercase">{label}</span>
        <span className="font-display font-bold text-amber-400">{value}<span className="text-amber-900/60">/{max}</span></span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${(value / max) * 100}%`, ...(color ? { background: color } : {}) }} />
      </div>
    </div>
  );
}

export default function CharacterSheet({ character }: { character: Character }) {
  const color = CLASS_COLOR[character.character_class] ?? "#f59e0b";
  const initial = (character.character_class?.[0] ?? character.name?.[0] ?? "?").toUpperCase();
  const level = character.level ?? 1;
  const xp    = character.xp ?? 0;
  const wins  = character.wins ?? 0;

  return (
    <div className="panel overflow-hidden">
      {/* Header band */}
      <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.15)", background: "rgba(0,0,0,0.2)" }}>
        <div className="flex items-center gap-4">
          {/* Avatar circle */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-display font-black shrink-0"
            style={{ background: `radial-gradient(circle, ${color}22 0%, rgba(0,0,0,0.6) 100%)`, border: `2px solid ${color}44`, color }}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-black text-lg text-amber-300 tracking-wider truncate">
              {character.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-display text-xs tracking-widest uppercase px-2 py-0.5 rounded"
                style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}>
                {character.character_class}
              </span>
              <span className="text-xs text-amber-900/60">Age {character.age}</span>
              <span className="text-xs font-display text-amber-900/60">·</span>
              <span className="text-xs font-display text-amber-400">Lv {level}</span>
              {wins > 0 && (
                <>
                  <span className="text-xs font-display text-amber-900/60">·</span>
                  <span className="text-xs font-display text-green-400/80">{wins} {wins === 1 ? "win" : "wins"}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backstory */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(245,158,11,0.1)" }}>
        <p className="text-amber-200/50 text-xs leading-relaxed italic">
          "{character.backstory}"
        </p>
      </div>

      {/* XP bar */}
      <div className="px-5 pt-4 pb-2">
        <StatBar
          label={`XP — Level ${level}`}
          value={xp}
          max={100}
          color="linear-gradient(90deg,#7c3aed,#6366f1)"
        />
      </div>

      {/* Combat stats */}
      <div className="px-5 pb-5 space-y-3">
        <p className="font-display text-xs tracking-widest uppercase text-amber-900/60 mb-1">Attributes</p>
        <StatBar label="Strength"     value={character.strength} />
        <StatBar label="Intelligence" value={character.intelligence} />
        <StatBar label="Agility"      value={character.agility} />
      </div>
    </div>
  );
}
