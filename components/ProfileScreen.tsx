"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Flame, Zap, Pencil, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "@/lib/translations";
import { useStatsStore } from "@/stores/statsStore";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { AccuracyChart } from "@/components/AccuracyChart";
import { Achievements } from "@/components/Achievements";
import { ProfileEditScreen } from "@/components/ProfileEditScreen";
import { SharedAccess } from "@/components/SharedAccess";
import { DIFFICULTIES, type Difficulty } from "@/types";
import { useGameStore } from "@/stores/gameStore";

interface ProfileScreenProps {
  onClose: () => void;
  onLoggedOut: () => void;
}

function formatAccuracy(correct: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((correct / total) * 100)}%`;
}

function formatDaysStreak(days: number, t: (key: string) => string): string {
  if (days === 1) return t("profile.daysStreak.one");
  if (days >= 2 && days <= 4) return `${days} ${t("profile.daysStreak.few")}`;
  return `${days} ${t("profile.daysStreak.many")}`;
}

function formatXP(xp: number, t: (key: string) => string): string {
  return `${xp} ${t("profile.xp")}`;
}

export function ProfileScreen({ onClose, onLoggedOut }: ProfileScreenProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sharedAccessOpen, setSharedAccessOpen] = useState(false);
  const gameDifficulty = useGameStore((s) => s.settings.difficulty);
  const [modeDifficulty, setModeDifficulty] =
    useState<Difficulty>(gameDifficulty);
  const [isEditing, setIsEditing] = useState(false);

  const user = useStatsStore((s) => s.user);
  const userResolved = useStatsStore((s) => s.userResolved);
  const userStats = useStatsStore((s) => s.userStats);
  const modeStats = useStatsStore((s) => s.modeStats);
  const activity = useStatsStore((s) => s.activity);
  const activityLoading = useStatsStore((s) => s.activityLoading);
  const loading = useStatsStore((s) => s.loading);
  const error = useStatsStore((s) => s.error);
  const loadAll = useStatsStore((s) => s.loadAll);

  // Refresh in background when reopening profile
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Redirect to home if user is signed out (after resolution)
  useEffect(() => {
    if (userResolved && !user) onLoggedOut();
  }, [userResolved, user, onLoggedOut]);

  const email = user?.email ?? null;
  const memberSince = user?.createdAt ?? null;
  const displayName = user?.displayName;
  const avatarUrl = user?.avatarUrl;

  if (isEditing) {
    return <ProfileEditScreen onClose={() => setIsEditing(false)} />;
  }

  if (sharedAccessOpen) {
    return <SharedAccess onClose={() => setSharedAccessOpen(false)} />;
  }

  const showStatsSkeleton = loading && userStats === null;
  const showStatsError = error !== null && userStats === null && !loading;

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
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
          aria-label={t("profile.back")}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <p className="hero__eyebrow">{t("profile.title")}</p>
      </header>

      <section className="panel panel--soft profile-user">
        <div className="profile-user__avatar" aria-hidden="true">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="profile-user__avatar-img" />
          ) : (
            (displayName || email || "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="profile-user__info">
          <p className="profile-user__name">{displayName || email || "—"}</p>
          {displayName && email && (
            <p className="profile-user__email-secondary">{email}</p>
          )}
          {memberSince && (
            <p className="profile-user__since">
              {t("profile.memberSince")}{" "}
              {new Date(memberSince).toLocaleDateString(
                locale === "kk" ? "kk-KZ" : "ru-RU",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          className="icon-button profile-user__edit"
          onClick={() => setIsEditing(true)}
          aria-label={t("profile.editProfile")}
          title={t("profile.editProfile")}
        >
          <Pencil size={16} />
        </button>
      </section>

      <div className="profile-badges-row">
        <span
          className="profile-badge profile-badge--streak"
          title={t("profile.streakDays")}
        >
          <Flame size={14} />
          <span>{formatDaysStreak(userStats?.streak_days ?? 0, t)}</span>
        </span>
        <span
          className="profile-badge profile-badge--xp"
          title={t("profile.xp")}
        >
          <Zap size={14} />
          <span>{formatXP(userStats?.total_xp ?? 0, t)}</span>
        </span>
      </div>

      {showStatsSkeleton ? (
        <p className="profile-empty">{t("profile.loadingStats")}</p>
      ) : showStatsError ? (
        <p className="profile-empty profile-empty--error">{error}</p>
      ) : (
        <>
          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("profile.generalStats")}</h2>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__label">{t("profile.sessions")}</span>
              <span className="stat-card__value">
                {userStats?.total_sessions ?? 0}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">{t("profile.questions")}</span>
              <span className="stat-card__value">{totalQuestions}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">{t("profile.accuracy")}</span>
              <span className="stat-card__value">
                {formatAccuracy(totalCorrect, totalQuestions)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">{t("profile.correct")}</span>
              <span className="stat-card__value">{totalCorrect}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">
                {t("profile.currentStreak")}
              </span>
              <span className="stat-card__value">
                {userStats?.current_streak ?? 0}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">
                {t("profile.bestStreak")}
              </span>
              <span className="stat-card__value">
                {userStats?.best_streak ?? 0}
              </span>
            </div>
          </div>

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("profile.activity")}</h2>
          </div>
          <ActivityHeatmap data={activity} loading={activityLoading} />

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("profile.weeklyAccuracy")}</h2>
          </div>
          <AccuracyChart data={activity} loading={activityLoading} />

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("profile.byMode")}</h2>
          </div>
          <div
            className="difficulty-picker difficulty-picker--plain"
            role="tablist"
            aria-label={t("profile.difficultyFilter")}
          >
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`difficulty-picker__option${
                  modeDifficulty === key
                    ? " difficulty-picker__option--active"
                    : ""
                }`}
                onClick={() => setModeDifficulty(key)}
                role="tab"
                aria-selected={modeDifficulty === key}
              >
                <span className="difficulty-picker__label">
                  {t(`common.${key}`)}
                </span>
              </button>
            ))}
          </div>
          {(() => {
            const rows = modeStats.filter(
              (r) => r.difficulty === modeDifficulty,
            );
            if (rows.length === 0) {
              return <p className="profile-empty">{t("profile.noModeData")}</p>;
            }
            return (
              <ul className="mode-stats">
                {rows.map((row) => (
                  <li
                    key={`${row.mode}-${row.difficulty}`}
                    className="mode-stats__item"
                  >
                    <div className="mode-stats__head">
                      <span className="mode-stats__title">
                        {t(`home.modes.${row.mode}`)}
                      </span>
                    </div>
                    <div className="mode-stats__meta">
                      <span>
                        {row.sessions_count} {t("profile.sessionsCount")}
                      </span>
                      <span>
                        {formatAccuracy(row.correct_count, row.questions_count)}{" "}
                        {t("profile.accuracyLabel")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            );
          })()}

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("profile.achievements")}</h2>
          </div>
          <Achievements />
        </>
      )}

      <div
        className="panel panel--soft info-card info-card--clickable"
        onClick={() => setSharedAccessOpen(true)}
      >
        <span className="info-card__icon">
          <Share2 size={24} />
        </span>
        <h3 className="info-card__title">{t("share.title")}</h3>
        <p className="info-card__description">{t("share.description")}</p>
        <button
          type="button"
          className="action-button action-button--small"
          onClick={(e) => {
            e.stopPropagation();
            setSharedAccessOpen(true);
          }}
        >
          {t("share.open")}
        </button>
      </div>

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
          {loggingOut ? t("profile.loggingOut") : t("profile.logout")}
        </span>
      </button>
    </section>
  );
}
