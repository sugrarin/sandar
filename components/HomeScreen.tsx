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
    <section className="flex flex-col gap-4">
      <div className="text-center pt-2 pb-1">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.2em] font-semibold mb-2">
          Math Trainer
        </p>
        <h1 className="text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-tight">
          Тренажёр счёта
        </h1>
      </div>

      <section className="bg-[var(--card)] backdrop-blur-xl border border-[var(--card-border)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">
            Сложность
          </h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-sm font-semibold">
            {DIFFICULTIES[difficulty].label}
          </span>
        </div>
        <div
          className="grid grid-cols-4 gap-2"
          role="tablist"
          aria-label="Выбор сложности"
        >
          {difficulties.map(([key, profile]) => (
            <button
              key={key}
              className={`flex flex-col items-center justify-center gap-2 h-[88px] rounded-xl transition-all duration-200 cursor-pointer border-2 ${
                difficulty === key
                  ? "bg-[var(--accent-soft)] border-[var(--accent)] shadow-sm"
                  : "bg-transparent border-transparent hover:bg-black/[0.03]"
              }`}
              type="button"
              onClick={() => onSelectDifficulty(key)}
              role="tab"
              aria-selected={difficulty === key}
            >
              <span className="text-3xl leading-none" aria-hidden="true">
                {profile.emoji}
              </span>
              <span
                className={`text-xs font-semibold ${difficulty === key ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}
              >
                {DIFFICULTY_LABELS[key]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[var(--card)] backdrop-blur-xl border border-[var(--card-border)] rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--text)] mb-4">
          Режим игры
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <button
              key={mode}
              className="flex flex-col items-center justify-center gap-3 h-[120px] bg-[var(--card)] border border-[var(--card-border)] rounded-xl cursor-pointer transition-all duration-200 hover:border-[var(--accent)] hover:shadow-md active:scale-[0.98] group"
              type="button"
              onClick={() => onStartGame(mode)}
            >
              <span className="w-12 h-12 flex items-center justify-center bg-[var(--accent-soft)] rounded-xl text-[var(--accent)] transition-transform duration-200 group-hover:scale-110">
                {MODE_ICONS[mode]}
              </span>
              <span className="text-sm font-semibold text-center leading-tight">
                {MODE_LABELS[mode]}
              </span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
