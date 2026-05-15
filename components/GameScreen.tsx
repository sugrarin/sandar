"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  MODE_LABELS,
  DIFFICULTIES,
  type GameMode,
  type Difficulty,
  type Task,
} from "@/types";

interface GameScreenProps {
  mode: GameMode;
  difficulty: Difficulty;
  currentIndex: number;
  total: number;
  score: number;
  task: Task;
  allowAdvance: boolean;
  lastAnswer: number | null;
  onAnswer: (selected: number) => void;
  onAdvance: () => void;
  onFinish: () => void;
}

const THIN_SPACE = "\u2009";

export function GameScreen({
  mode,
  difficulty,
  currentIndex,
  total,
  task,
  allowAdvance,
  lastAnswer,
  onAnswer,
  onAdvance,
  onFinish,
}: GameScreenProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
  }, [task]);

  const progress = ((currentIndex + 1) / total) * 100;

  const handleClick = (option: number) => {
    if (showResult && allowAdvance) {
      onAdvance();
      return;
    }

    if (showResult) return;

    setSelectedOption(option);
    setShowResult(true);
    onAnswer(option);
  };

  const getButtonClass = (option: number) => {
    if (!showResult) return "";

    if (option === task.answer) {
      return "bg-[var(--success-soft)] border-[var(--accent)]";
    }

    if (option === lastAnswer && option !== task.answer) {
      return "bg-[var(--error-soft)] border-[var(--error)]";
    }

    return "pointer-events-none";
  };

  const subtitle =
    mode === "review"
      ? "Ошибки до полного решения"
      : `${DIFFICULTIES[difficulty].emoji} ${DIFFICULTIES[difficulty].label}`;

  return (
    <section className="flex flex-col w-full">
      <section className="flex flex-col gap-8 bg-[var(--card)] backdrop-blur-xl border border-[var(--card-border)] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-sm font-semibold">
              {MODE_LABELS[mode]}
            </span>
            <div className="flex items-center gap-4">
              <p className="text-base text-[var(--text-muted)] tabular-nums font-medium">
                {currentIndex + 1} / {total}
              </p>
              <button
                className="w-10 h-10 flex items-center justify-center bg-black/[0.03] border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-black/[0.08] active:scale-95"
                type="button"
                onClick={onFinish}
                aria-label="Закончить раунд"
              >
                <X
                  className="w-5 h-5 text-[var(--text-muted)]"
                  strokeWidth={2.5}
                />
              </button>
            </div>
          </div>
          <div
            className="h-2 bg-black/[0.06] rounded-full overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
        </div>

        <div className="text-center py-6">
          <p className="text-base text-[var(--text-muted)] mb-3 font-medium">
            {subtitle}
          </p>
          <h2 className="text-[clamp(3rem,15vw,5rem)] font-bold tabular-nums tracking-tight">
            {task.question}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {task.options.map((option) => (
            <button
              key={option}
              className={`py-6 px-4 bg-[var(--card)] border-2 border-[var(--card-border)] rounded-xl font-bold text-[clamp(1.5rem,6vw,2.25rem)] text-[var(--text)] cursor-pointer transition-all duration-200 tabular-nums hover:border-[var(--accent)] hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClass(option)}`}
              type="button"
              onClick={() => handleClick(option)}
              disabled={
                showResult &&
                !allowAdvance &&
                option !== task.answer &&
                option !== lastAnswer
              }
            >
              {option}
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
