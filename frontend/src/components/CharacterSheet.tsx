import { Character } from "@/lib/genlayer";

const CLASS_EMOJI: Record<string, string> = {
  Warrior: "⚔️",
  Mage: "🔮",
  Rogue: "🗡️",
  Ranger: "🏹",
  Bard: "🎵",
  Cleric: "✨",
};

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className="bg-amber-500 h-2 rounded-full transition-all"
          style={{ width: `${(value / 20) * 100}%` }}
        />
      </div>
      <span className="w-6 text-right text-gray-300 text-xs">{value}</span>
    </div>
  );
}

export default function CharacterSheet({ character }: { character: Character }) {
  const emoji = CLASS_EMOJI[character.character_class] ?? "🧙";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{emoji}</span>
        <div>
          <h2 className="text-lg font-bold text-amber-300">{character.name}</h2>
          <div className="text-sm text-gray-400">
            {character.character_class} · Age {character.age}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-400 italic leading-relaxed">
        "{character.backstory}"
      </p>

      <div className="space-y-2 pt-1">
        <StatBar label="Strength" value={character.strength} />
        <StatBar label="Intelligence" value={character.intelligence} />
        <StatBar label="Agility" value={character.agility} />
      </div>
    </div>
  );
}
