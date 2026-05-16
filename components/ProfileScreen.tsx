"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useStatsStore } from "@/stores/statsStore";
import { MODE_LABELS, type Difficulty } from "@/types";

interface ProfileScreenProps {
  onClose: () => void;
  onLoggedOut: () => void;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
  brain: "Экстрим",
};

function formatAccuracy(correct: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((correct / total) * 100)}%`;
}

export function ProfileScreen({ onClose, onLoggedOut }: ProfileScreenProps) {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const userStats = useStatsStore((s) => s.userStats);
  const modeStats = useStatsStore((s) => s.modeStats);
  const loading = useStatsStore((s) => s.loading);
  const error = useStatsStore((s) => s.error);
  const lastFetchedAt = useStatsStore((s) => s.lastFetchedAt);
  const fetchStats = useStatsStore((s) => s.fetchStats);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        onLoggedOut();
        return;
      }
      setEmail(user.email ?? null);
      setMemberSince(user.created_at ?? null);
      fetchStats();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const showSkeleton = loading && lastFetchedAt === null;

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    onLoggedOut();
  };

  const totalQuestions = userStats?.total_questions ?? 0;
  const totalCorrect = userStats?.total_correct ?? 0;

  return (
    <section className="screen screen--active">
      <header className="profile-header">
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Назад"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <p className="hero__eyebrow">Профиль</p>
      </header>

      <section className="panel panel--soft profile-user">
        <div className="profile-user__avatar" aria-hidden="true">
          {email ? email.slice(0, 2).toUpperCase() : "—"}
        </div>
        <div className="profile-user__info">
          <p className="profile-user__email">{email || "—"}</p>
          {memberSince && (
            <p className="profile-user__since">
              С нами с{" "}
              {new Date(memberSince).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </section>

      {showSkeleton ? (
        <p className="profile-empty">Загружаем статистику…</p>
      ) : error && lastFetchedAt === null ? (
        <p className="profile-empty profile-empty--error">{error}</p>
      ) : (
        <>
          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">Общая статистика</h2>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__label">Тренировок</span>
              <span className="stat-card__value">
                {userStats?.total_sessions ?? 0}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Вопросов</span>
              <span className="stat-card__value">{totalQuestions}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Точность</span>
              <span className="stat-card__value">
                {formatAccuracy(totalCorrect, totalQuestions)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Верных</span>
              <span className="stat-card__value">{totalCorrect}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Текущая серия</span>
              <span className="stat-card__value">
                {userStats?.current_streak ?? 0}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Лучшая серия</span>
              <span className="stat-card__value">
                {userStats?.best_streak ?? 0}
              </span>
            </div>
          </div>

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">По режимам</h2>
          </div>
          {modeStats.length === 0 ? (
            <p className="profile-empty">Пока нет данных по режимам</p>
          ) : (
            <ul className="mode-stats">
              {modeStats.map((row) => (
                <li
                  key={`${row.mode}-${row.difficulty}`}
                  className="mode-stats__item"
                >
                  <div className="mode-stats__head">
                    <span className="mode-stats__title">
                      {MODE_LABELS[row.mode] || row.mode}
                    </span>
                    <span className="mode-stats__diff">
                      {DIFFICULTY_LABELS[row.difficulty] || row.difficulty}
                    </span>
                  </div>
                  <div className="mode-stats__meta">
                    <span>{row.sessions_count} тренировок</span>
                    <span>
                      {formatAccuracy(row.correct_count, row.questions_count)}{" "}
                      точность
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <button
        type="button"
        className="action-button profile-logout"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        <span className="action-button__icon" aria-hidden="true">
          <LogOut strokeWidth={2} />
        </span>
        <span className="action-button__label">
          {loggingOut ? "Выходим…" : "Выйти"}
        </span>
      </button>
    </section>
  );
}
