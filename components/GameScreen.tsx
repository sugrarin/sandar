"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import {
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
  const t = useTranslations();
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

  const getButtonModifier = (option: number) => {
    if (!showResult) return "";
    if (option === task.answer) return " answer-button--correct";
    if (option === lastAnswer && option !== task.answer)
      return " answer-button--wrong";
    return " answer-button--locked";
  };

  const subtitle =
    mode === "review"
      ? t("game.reviewSubtitle")
      : `${DIFFICULTIES[difficulty].emoji} ${t(`difficulty.labels.${difficulty}`)}`;

  return (
    <section className="screen screen--active">
      <section className="panel panel--game">
        <div className="game-status">
          <div className="game-status__meta">
            <p className="game-status__mode">{t(`home.modes.${mode}`)}</p>
            <div className="game-status__side">
              <p className="game-status__counter">
                {currentIndex + 1}
                {THIN_SPACE}/{THIN_SPACE}
                {total}
              </p>
              <button
                className="icon-button"
                type="button"
                onClick={onFinish}
                aria-label={t("game.finishRound")}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="progress" aria-hidden="true">
            <div
              className="progress__bar"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
        </div>

        <div className="problem-card">
          <p className="problem-card__subtitle">{subtitle}</p>
          <h2 className="problem-card__question">{task.question}</h2>
        </div>

        <div className="answer-grid">
          {task.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`answer-button${getButtonModifier(option)}`}
              onClick={() => handleClick(option)}
              disabled={
                showResult &&
                !allowAdvance &&
                option !== task.answer &&
                option !== lastAnswer
              }
            >
              <span className="answer-button__value">{option}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
