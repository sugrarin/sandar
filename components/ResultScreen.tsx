"use client";

import { useEffect, useRef } from "react";
import {
  Plus,
  Minus,
  X,
  Divide,
  Grid3X3,
  Dices,
  Search,
  RefreshCw,
} from "lucide-react";
import { MODE_LABELS, type GameMode } from "@/types";

interface ResultScreenProps {
  score: number;
  total: number;
  hasMistakes: boolean;
  onReview: () => void;
  onReplay: () => void;
  onReturnHome: () => void;
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

export function ResultScreen({
  score,
  total,
  hasMistakes,
  onReview,
  onReplay,
  onReturnHome,
  onStartGame,
}: ResultScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPerfect = score === total;

  useEffect(() => {
    if (!isPerfect || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * -rect.height * 0.5,
      size: 6 + Math.random() * 6,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 + 1.5,
      rotation: Math.random() * Math.PI,
      spin: Math.random() * 0.25 + 0.04,
      color: ["#1f8a70", "#f6c86a", "#ff7f6a", "#4c89ff", "#ffffff"][
        Math.floor(Math.random() * 5)
      ],
    }));

    let frameId: number;
    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.vy += 0.03;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      });

      frameId = requestAnimationFrame(draw);
    };

    draw();

    const timeout = setTimeout(() => {
      cancelAnimationFrame(frameId);
    }, 2600);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeout);
    };
  }, [isPerfect]);

  return (
    <section className="screen screen--active">
      {isPerfect && (
        <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
      )}

      <section className="panel panel--result">
        <div className="result-summary">
          <p className="result-summary__eyebrow">Готово</p>
          <div className="result-summary__title-row">
            <h2 className="result-summary__title">Результат</h2>
            <button
              className="icon-button"
              type="button"
              onClick={onReturnHome}
              aria-label="Вернуться на главную"
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="result-summary__score">
            {score}&thinsp;/&thinsp;{total}
          </p>
        </div>

        <div className="action-stack">
          <button
            type="button"
            className="action-button action-button--accent"
            onClick={onReview}
            disabled={!hasMistakes}
          >
            <span className="action-button__icon" aria-hidden="true">
              <Search strokeWidth={2} />
            </span>
            <span className="action-button__label">
              {hasMistakes ? "Разобрать ошибки" : "Ошибок нет"}
            </span>
          </button>

          <button
            type="button"
            className="action-button"
            onClick={onReplay}
          >
            <span className="action-button__icon" aria-hidden="true">
              <RefreshCw strokeWidth={2} />
            </span>
            <span className="action-button__label">Ещё раунд</span>
          </button>
        </div>

        <div className="panel__header panel__header--tight">
          <h3 className="panel__title">Новый раунд</h3>
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
