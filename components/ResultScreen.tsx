'use client';

import { useEffect, useRef } from 'react';
import { MODE_LABELS, type GameMode } from '@/types';

interface ResultScreenProps {
  score: number;
  total: number;
  hasMistakes: boolean;
  onReview: () => void;
  onReplay: () => void;
  onReturnHome: () => void;
  onStartGame: (mode: GameMode) => void;
}

const MODES: GameMode[] = ['addition', 'subtraction', 'multiplication', 'division', 'table', 'mixed'];

const MODE_ICONS: Record<GameMode, JSX.Element> = {
  addition: <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  subtraction: <svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>,
  multiplication: <svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  division: <svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="1"/><line x1="5" x2="19" y1="12" y2="12"/><circle cx="12" cy="18" r="1"/></svg>,
  table: <svg viewBox="0 0 24 24"><path d="M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"/><path d="m16 16 5 5"/><path d="m16 21 5-5"/></svg>,
  mixed: <svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M15 9h.01"/><path d="M9 15h.01"/></svg>,
  review: <svg viewBox="0 0 24 24" />
};

export function ResultScreen({ score, total, hasMistakes, onReview, onReplay, onReturnHome, onStartGame }: ResultScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPerfect = score === total;

  useEffect(() => {
    if (!isPerfect || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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
      color: ['#1f8a70', '#f6c86a', '#ff7f6a', '#4c89ff', '#ffffff'][Math.floor(Math.random() * 5)]
    }));

    let frameId: number;
    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      pieces.forEach(p => {
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
      {isPerfect && <canvas ref={canvasRef} className="confetti" aria-hidden="true" />}

      <section className="panel panel--result">
        <div className="result-summary">
          <p className="result-summary__eyebrow">Готово</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="result-summary__title">Результат</h2>
            <button className="icon-button" onClick={onReturnHome} aria-label="Вернуться на главную">
              <svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <p className="result-summary__score">{score}&thinsp;/&thinsp;{total}</p>
        </div>

        <div className="action-stack">
          <button
            className="action-button action-button--wide"
            onClick={onReview}
            disabled={!hasMistakes}
          >
            <span className="action-button__icon">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 7v4"/><path d="M11 15h.01"/></svg>
            </span>
            <span className="action-button__label">
              {hasMistakes ? 'Разобрать ошибки' : 'Ошибок нет'}
            </span>
          </button>

          <button className="action-button action-button--wide" onClick={onReplay}>
            <span className="action-button__icon">
              <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            </span>
            <span className="action-button__label">Еще раунд</span>
          </button>
        </div>

        <div className="panel__header panel__header--tight">
          <h3 className="panel__title">Новый раунд</h3>
        </div>
        <div className="mode-grid">
          {MODES.map((mode) => (
            <button
              key={mode}
              className="mode-card"
              onClick={() => onStartGame(mode)}
            >
              <span className="mode-card__icon">{MODE_ICONS[mode]}</span>
              <span className="mode-card__title">{MODE_LABELS[mode]}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
