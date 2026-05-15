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
  addition: <Plus strokeWidth={2} />,
  subtraction: <Minus strokeWidth={2} />,
  multiplication: <X strokeWidth={2} />,
  division: <Divide strokeWidth={2} />,
  table: <Grid3X3 strokeWidth={2} />,
  mixed: <Dices strokeWidth={2} />,
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
    <section className="screen screen--active">
      <header className="hero">
        <p className="hero__eyebrow">Math trainer</p>
        <h1 className="hero__title">Тренажёр счёта в уме</h1>
      </header>

      <section className="panel panel--soft">
        <div className="panel__header">
          <h2 className="panel__title">Сложность</h2>
          <p className="panel__note">{DIFFICULTIES[difficulty].label}</p>
        </div>
        <div
          className="difficulty-picker"
          role="tablist"
          aria-label="Выбор сложности"
        >
          {difficulties.map(([key, profile]) => (
            <button
              key={key}
              type="button"
              className={`difficulty-picker__option${
                difficulty === key ? " difficulty-picker__option--active" : ""
              }`}
              onClick={() => onSelectDifficulty(key)}
              role="tab"
              aria-selected={difficulty === key}
            >
              <span className="difficulty-picker__emoji" aria-hidden="true">
                {profile.emoji}
              </span>
              <span className="difficulty-picker__label">
                {DIFFICULTY_LABELS[key]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header panel__header--tight">
          <h2 className="panel__title">Режим</h2>
        </div>
        <div className="mode-grid">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className="mode-card"
              onClick={() => onStartGame(mode)}
            >
              <span className="mode-card__icon" aria-hidden="true">
                {MODE_ICONS[mode]}
              </span>
              <span className="mode-card__title">{MODE_LABELS[mode]}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
