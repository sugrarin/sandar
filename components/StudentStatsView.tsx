"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Flame, Zap, X } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { AccuracyChart } from "@/components/AccuracyChart";
import { SegmentedControl } from "@/components/SegmentedControl";
import { DIFFICULTIES, type Difficulty } from "@/types";

interface StudentStatsViewProps {
  studentId: string;
  onUnlink: (accessId: string) => void;
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

export function StudentStatsView({
  studentId,
  onUnlink,
}: StudentStatsViewProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const [modeDifficulty, setModeDifficulty] = useState<Difficulty>("easy");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [modeStats, setModeStats] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [accessId, setAccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentStats();
  }, [studentId]);

  const fetchStudentStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch student profile and stats
      const [profileRes, statsRes, modeRes, activityRes, accessRes] =
        await Promise.all([
          fetch(`/api/share/student/${studentId}/profile`),
          fetch(`/api/share/student/${studentId}/stats`),
          fetch(`/api/share/student/${studentId}/mode-stats`),
          fetch(`/api/share/student/${studentId}/activity`),
          fetch(`/api/share/student/${studentId}/access-id`),
        ]);

      if (!profileRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch student data");
      }

      const [profileData, statsData, modeData, activityData, accessData] =
        await Promise.all([
          profileRes.json(),
          statsRes.json(),
          modeRes.json(),
          activityRes.json(),
          accessRes.json(),
        ]);

      setStudent(profileData);
      setUserStats(statsData);
      setModeStats(modeData.mode_stats || []);
      setActivity(activityData.activity || []);
      setAccessId(accessData.access_id);
    } catch (err) {
      console.error("Failed to fetch student stats:", err);
      setError("Failed to load student statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = () => {
    if (accessId) {
      onUnlink(accessId);
    }
  };

  if (loading) {
    return <p className="profile-empty">{t("profile.loadingStats")}</p>;
  }

  if (error || !student) {
    return (
      <p className="profile-empty profile-empty--error">
        {error || "Student not found"}
      </p>
    );
  }

  const displayName = student.display_name;
  const email = student.email;
  const avatarUrl = student.avatar_url;
  const memberSince = student.created_at;

  const totalQuestions = userStats?.total_questions ?? 0;
  const totalCorrect = userStats?.total_correct ?? 0;

  return (
    <>
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
          <span className="stat-card__label">{t("profile.currentStreak")}</span>
          <span className="stat-card__value">
            {userStats?.current_streak ?? 0}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">{t("profile.bestStreak")}</span>
          <span className="stat-card__value">
            {userStats?.best_streak ?? 0}
          </span>
        </div>
      </div>

      <div className="panel__header panel__header--tight">
        <h2 className="panel__title">{t("profile.activity")}</h2>
      </div>
      <ActivityHeatmap data={activity as any} loading={false} />

      <div className="panel__header panel__header--tight">
        <h2 className="panel__title">{t("profile.weeklyAccuracy")}</h2>
      </div>
      <AccuracyChart data={activity as any} loading={false} />

      <div className="panel__header panel__header--tight">
        <h2 className="panel__title">{t("profile.byMode")}</h2>
      </div>
      <SegmentedControl<Difficulty>
        items={(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => ({
          value: key,
          label: t(`common.${key}`),
        }))}
        value={modeDifficulty}
        onChange={setModeDifficulty}
        ariaLabel={t("profile.difficultyFilter")}
      />
      {(() => {
        const rows = modeStats.filter(
          (r: any) => r.difficulty === modeDifficulty,
        );
        if (rows.length === 0) {
          return <p className="profile-empty">{t("profile.noModeData")}</p>;
        }
        return (
          <ul className="mode-stats">
            {rows.map((row: any) => (
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

      <button
        type="button"
        className="action-button profile-logout"
        onClick={handleUnlink}
      >
        <span className="action-button__icon" aria-hidden="true">
          <X strokeWidth={2} />
        </span>
        <span className="action-button__label">{t("share.unlink")}</span>
      </button>
    </>
  );
}
