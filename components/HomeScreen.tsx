'use client';

import { DIFFICULTIES, MODE_LABELS, type Difficulty, type GameMode } from '@/types';

interface HomeScreenProps {
  difficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onStartGame: (mode: GameMode) => void;
}

const MODES: GameMode[] = ['addition', 'subtraction', 'multiplication', 'division', 'table', 'mixed'];

const MODE_ICONS: Record<GameMode, JSX.Element> = {
  addition: (
    <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  ),
  subtraction: (
    <svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
  ),
  multiplication: (
    <svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  ),
  division: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="1"/><line x1="5" x2="19" y1="12" y2="12"/><circle cx="12" cy="18" r="1"/></svg>
  ),
  table: (
    <svg viewBox="0 0 24 24"><path d="M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"/><path d="m16 16 5 5"/><path d="m16 21 5-5"/></svg>
  ),
  mixed: (
    <svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M15 9h.01"/><path d="M9 15h.01"/></svg>
  ),
  review: <svg viewBox="0 0 24 24" />, // Not shown on home
};

export function HomeScreen({ difficulty, onSelectDifficulty, onStartGame }: HomeScreenProps) {
  const difficulties = Object.entries(DIFFICULTIES) as [Difficulty, typeof DIFFICULTIES.easy][];

  return (
    <section className="screen screen--active">
      <div className="hero">
        <p className="hero__eyebrow">Math trainer</p>
        <h1 className="hero__title">Тренажёр счёта в уме</h1>
      </div>

      <section className="panel panel--soft">
        <div className="panel__header">
          <h2 className="panel__title">Сложность</h2>
          <p className="panel__note">{DIFFICULTIES[difficulty].label}</p>
        </div>
        <div className="difficulty-picker" role="tablist" aria-label="Выбор сложности">
          {difficulties.map(([key, profile]) => (
            <button
              key={key}
              className={`difficulty-picker__option ${difficulty === key ? 'difficulty-picker__option--active' : ''}`}
              type="button"
              onClick={() => onSelectDifficulty(key)}
              role="tab"
              aria-selected={difficulty === key}
            >
              <span className="difficulty-picker__emoji" aria-hidden="true">{profile.emoji}</span>
              <span className="difficulty-picker__label">
                {key === 'easy' && 'Легко'}
                {key === 'medium' && 'Средне'}
                {key === 'hard' && 'Сложно'}
                {key === 'brain' && 'Экстрим'}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Режим</h2>
        </div>
        <div className="mode-grid">
          {MODES.map((mode) => (
            <button
              key={mode}
              className="mode-card"
              type="button"
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
