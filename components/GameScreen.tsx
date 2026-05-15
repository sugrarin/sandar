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
    <section className="flex flex-col">
      <section className="flex flex-col gap-6 bg-[var(--card)] backdrop-blur-[10px] border border-[var(--card-border)] rounded-[1.25rem] p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              {MODE_LABELS[mode]}
            </p>
            <div className="flex items-center gap-3">
              <p className="text-sm text-[var(--text-muted)] tabular-nums">
                {currentIndex + 1}
                {THIN_SPACE}/{THIN_SPACE}
                {total}
              </p>
              <button
                className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer transition-colors duration-150 hover:bg-black/5"
                type="button"
                onClick={onFinish}
                aria-label="Закончить раунд"
              >
                <X
                  className="w-5 h-5 text-[var(--text-muted)]"
                  strokeWidth={2}
                />
              </button>
            </div>
          </div>
          <div
            className="h-1 bg-black/[0.08] rounded-sm overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[var(--accent)] rounded-sm transition-all duration-300"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
        </div>

        <div className="text-center py-8 px-4">
          <p className="text-sm text-[var(--text-muted)] mb-2">{subtitle}</p>
          <h2 className="text-[clamp(2.5rem,12vw,4rem)] font-semibold tabular-nums">
            {task.question}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {task.options.map((option) => (
            <button
              key={option}
              className={`p-5 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl font-medium text-[clamp(1.25rem,5vw,1.75rem)] text-[var(--text)] cursor-pointer transition-all duration-150 tabular-nums hover:-translate-y-px hover:shadow-lg active:scale-[0.985] ${getButtonClass(option)}`}
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
