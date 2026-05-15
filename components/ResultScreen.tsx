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
    <section className="flex flex-col">
      {isPerfect && (
        <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
      )}

      <section className="bg-[var(--card)] backdrop-blur-[10px] border border-[var(--card-border)] rounded-[1.25rem] p-4 mb-4">
        <div className="text-center py-6 px-4">
          <p className="text-sm text-[var(--text-muted)] uppercase tracking-wider">
            Готово
          </p>
          <div className="flex items-center justify-between mt-1 mb-4">
            <h2 className="text-[clamp(1.5rem,6vw,2rem)] font-semibold">
              Результат
            </h2>
            <button
              className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer transition-colors duration-150 hover:bg-black/5"
              onClick={onReturnHome}
              aria-label="Вернуться на главную"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" strokeWidth={2} />
            </button>
          </div>
          <p className="text-[clamp(3rem,15vw,5rem)] font-semibold tabular-nums text-[var(--accent)]">
            {score}&thinsp;/&thinsp;{total}
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <button
            className="w-full flex items-center justify-center gap-2 p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            onClick={onReview}
            disabled={!hasMistakes}
          >
            <Search className="w-5 h-5 text-[var(--text)]" strokeWidth={2} />
            <span className="text-[0.9375rem] font-medium">
              {hasMistakes ? "Разобрать ошибки" : "Ошибок нет"}
            </span>
          </button>

          <button
            className="w-full flex items-center justify-center gap-2 p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg active:scale-[0.985]"
            onClick={onReplay}
          >
            <RefreshCw className="w-5 h-5 text-[var(--text)]" strokeWidth={2} />
            <span className="text-[0.9375rem] font-medium">Еще раунд</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Новый раунд</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <button
              key={mode}
              className="flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg active:scale-[0.985]"
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
