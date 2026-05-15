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
  addition: <Plus className="w-[22px] h-[22px]" strokeWidth={2} />,
  subtraction: <Minus className="w-[22px] h-[22px]" strokeWidth={2} />,
  multiplication: <X className="w-[22px] h-[22px]" strokeWidth={2} />,
  division: <Divide className="w-[22px] h-[22px]" strokeWidth={2} />,
  table: <Grid3X3 className="w-[22px] h-[22px]" strokeWidth={2} />,
  mixed: <Dices className="w-[22px] h-[22px]" strokeWidth={2} />,
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
    <section className="flex flex-col w-full">
      {isPerfect && (
        <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
      )}

      <section className="flex flex-col gap-4">
        <section className="bg-[var(--card)] backdrop-blur-xl border border-[var(--card-border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-sm font-semibold">
              Раунд завершён
            </span>
            <button
              className="w-10 h-10 flex items-center justify-center bg-black/[0.04] border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-black/[0.08] active:scale-95"
              onClick={onReturnHome}
              aria-label="Вернуться на главную"
            >
              <X
                className="w-5 h-5 text-[var(--text-muted)]"
                strokeWidth={2.5}
              />
            </button>
          </div>

          <div className="text-center mb-6">
            <p className="text-[clamp(4rem,18vw,6rem)] font-bold tabular-nums text-[var(--accent)] leading-none tracking-tight">
              {score}
              <span className="text-[var(--text-muted)] text-[0.5em] font-bold">
                /{total}
              </span>
            </p>
            <p className="text-base text-[var(--text-muted)] mt-3 font-medium">
              {score === total
                ? "Идеально! 🎉"
                : score >= total * 0.8
                  ? "Отлично! 👏"
                  : score >= total * 0.5
                    ? "Хорошо! 💪"
                    : "Продолжай тренироваться! 🌱"}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="w-full h-14 flex items-center justify-center gap-2.5 px-6 bg-[var(--accent)] text-white border-none rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none font-semibold text-base"
              onClick={onReview}
              disabled={!hasMistakes}
            >
              <Search className="w-5 h-5" strokeWidth={2.5} />
              <span>Разобрать ошибки</span>
            </button>

            <button
              className="w-full h-14 flex items-center justify-center gap-2.5 px-6 bg-[var(--card)] border-2 border-[var(--card-border)] rounded-xl cursor-pointer transition-all duration-200 hover:border-[var(--accent)] hover:shadow-md active:scale-[0.98] font-semibold text-base"
              onClick={onReplay}
            >
              <RefreshCw
                className="w-5 h-5 text-[var(--accent)]"
                strokeWidth={2.5}
              />
              <span>Ещё раунд</span>
            </button>
          </div>
        </section>

        <section className="bg-[var(--card)] backdrop-blur-xl border border-[var(--card-border)] rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[var(--text)] mb-4">
            Новый раунд
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((mode) => (
              <button
                key={mode}
                className="flex items-center gap-3 h-16 px-4 bg-[var(--card)] border border-[var(--card-border)] rounded-xl cursor-pointer transition-all duration-200 hover:border-[var(--accent)] hover:shadow-md active:scale-[0.98] group"
                onClick={() => onStartGame(mode)}
              >
                <span className="shrink-0 w-10 h-10 flex items-center justify-center bg-[var(--accent-soft)] rounded-xl text-[var(--accent)] transition-transform duration-200 group-hover:scale-110">
                  {MODE_ICONS[mode]}
                </span>
                <span className="text-sm font-semibold text-left leading-tight">
                  {MODE_LABELS[mode]}
                </span>
              </button>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}
