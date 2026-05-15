"use client";

import { Plus, Minus, X, Divide, Grid3X3, Dices } from "lucide-react";
import {
  DIFFICULTIES,
  MODE_LABELS,
  type Difficulty,
  type GameMode,
} from "@/types";

interface HomeScreenProps {
  difficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onStartGame: (mode: GameMode) => void;
}

const MODES: GameMode[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "table",
  "mixed",
];

const MODE_ICONS: Record<GameMode, React.ReactNode> = {
  addition: <Plus className="w-[22px] h-[22px]" strokeWidth={2} />,
  subtraction: <Minus className="w-[22px] h-[22px]" strokeWidth={2} />,
  multiplication: <X className="w-[22px] h-[22px]" strokeWidth={2} />,
  division: <Divide className="w-[22px] h-[22px]" strokeWidth={2} />,
  table: <Grid3X3 className="w-[22px] h-[22px]" strokeWidth={2} />,
  mixed: <Dices className="w-[22px] h-[22px]" strokeWidth={2} />,
  review: null,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
  brain: "Экстрим",
};

export function HomeScreen({
  difficulty,
  onSelectDifficulty,
  onStartGame,
}: HomeScreenProps) {
  const difficulties = Object.entries(DIFFICULTIES) as [
    Difficulty,
    typeof DIFFICULTIES.easy,
  ][];

  return (
    <section className="flex flex-col">
      <div className="my-5 mb-6">
        <p className="text-sm text-[var(--text-muted)] uppercase tracking-wider mb-1">
          Math trainer
        </p>
        <h1 className="text-[clamp(2rem,8vw,3rem)] font-semibold leading-tight">
          Тренажёр счёта в уме
        </h1>
      </div>

      <section className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-[10px] border border-[var(--card-border)] rounded-[1.25rem] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Сложность</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {DIFFICULTIES[difficulty].label}
          </p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Выбор сложности">
          {difficulties.map(([key, profile]) => (
            <button
              key={key}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-150 cursor-pointer border ${
                difficulty === key
                  ? "bg-[rgba(31,138,112,0.12)] border-[rgba(31,138,112,0.3)]"
                  : "bg-transparent border-transparent hover:bg-black/5"
              }`}
              type="button"
              onClick={() => onSelectDifficulty(key)}
              role="tab"
              aria-selected={difficulty === key}
            >
              <span className="text-2xl" aria-hidden="true">
                {profile.emoji}
              </span>
              <span
                className={`text-xs ${difficulty === key ? "text-[var(--text)] font-medium" : "text-[var(--text-muted)]"}`}
              >
                {DIFFICULTY_LABELS[key]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[var(--card)] backdrop-blur-[10px] border border-[var(--card-border)] rounded-[1.25rem] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Режим</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <button
              key={mode}
              className="flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg active:scale-[0.985]"
              type="button"
              onClick={() => onStartGame(mode)}
            >
              <span className="w-10 h-10 flex items-center justify-center bg-black/[0.04] rounded-xl text-[var(--text)]">
                {MODE_ICONS[mode]}
              </span>
              <span className="text-[0.9375rem] font-medium">
                {MODE_LABELS[mode]}
              </span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
