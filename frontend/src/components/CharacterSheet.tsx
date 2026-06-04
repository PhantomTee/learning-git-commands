import { Character } from "@/lib/genlayer";

const CLASS_EMOJI: Record<string, string> = {
  Warrior: "⚔️", Mage: "🔮", Rogue: "🗡️",
  Ranger: "🏹", Bard: "🎵", Cleric: "✨",
};

const CLASS_COLOR: Record<string, string> = {
  Warrior: "#ef4444", Mage: "#8b5cf6", Rogue: "#6b7280",
  Ranger: "#22c55e",  Bard:  "#ec4899", Cleric: "#f59e0b",
};

function StatBar({ label, value, max = 20 }: { label: string; value: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-display tracking-wider text-amber-200/70 uppercase">{label}</span>
        <span className="font-display font-bold text-amber-400">{value}<span className="text-amber-900/60">/{max}</span></span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

export default function CharacterSheet({ character }: { character: Character }) {
  const emoji = CLASS_EMOJI[character.character_class] ?? "🧙";
  const color = CLASS_COLOR[character.character_class] ?? "#f59e0b";

  return (
    <div className="panel overflow-hidden">
      {/* Header band */}
      <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.15)", background: "rgba(0,0,0,0.2)" }}>
        <div className="flex items-center gap-4">
          {/* Avatar circle */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{ background: `radial-gradient(circle, ${color}22 0%, rgba(0,0,0,0.6) 100%)`, border: `2px solid ${color}44` }}>
            {emoji}
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-black text-lg text-amber-300 tracking-wider truncate">
              {character.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-display text-xs tracking-widest uppercase px-2 py-0.5 rounded"
                style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}>
                {character.character_class}
              </span>
              <span className="text-xs text-amber-900/60">Age {character.age}</span>
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

      {/* Stats */}
      <div className="p-5 space-y-3">
        <p className="font-display text-xs tracking-widest uppercase text-amber-900/60 mb-4">Attributes</p>
        <StatBar label="Strength" value={character.strength} />
        <StatBar label="Intelligence" value={character.intelligence} />
        <StatBar label="Agility" value={character.agility} />
      </div>
    </div>
  );
}
