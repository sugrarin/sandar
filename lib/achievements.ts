import {
  Sparkles,
  BookOpen,
  Crown,
  Target,
  Star,
  Flame,
  Zap,
  Trophy,
  X,
  Divide,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserStatsRow, ModeStatsRow } from "@/stores/statsStore";

export interface AchievementContext {
  userStats: UserStatsRow | null;
  modeStats: ModeStatsRow[];
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: LucideIcon;
  progress: (ctx: AchievementContext) => { current: number; goal: number };
}

const define = (
  code: string,
  title: string,
  description: string,
  icon: LucideIcon,
  progress: Achievement["progress"],
): Achievement => ({ code, title, description, icon, progress });

export const ACHIEVEMENTS: Achievement[] = [
  define(
    "first_session",
    "Первая тренировка",
    "Заверши первую тренировку",
    Sparkles,
    ({ userStats }) => ({
      current: Math.min(userStats?.total_sessions ?? 0, 1),
      goal: 1,
    }),
  ),
  define(
    "ten_sessions",
    "Постоянство",
    "Заверши 10 тренировок",
    BookOpen,
    ({ userStats }) => ({
      current: Math.min(userStats?.total_sessions ?? 0, 10),
      goal: 10,
    }),
  ),
  define(
    "hundred_sessions",
    "Сотый круг",
    "Заверши 100 тренировок",
    Crown,
    ({ userStats }) => ({
      current: Math.min(userStats?.total_sessions ?? 0, 100),
      goal: 100,
    }),
  ),
  define(
    "hundred_questions",
    "Сотня вопросов",
    "Реши 100 вопросов",
    Target,
    ({ userStats }) => ({
      current: Math.min(userStats?.total_questions ?? 0, 100),
      goal: 100,
    }),
  ),
  define(
    "thousand_questions",
    "Тысяча решённых",
    "Реши 1000 вопросов",
    Star,
    ({ userStats }) => ({
      current: Math.min(userStats?.total_questions ?? 0, 1000),
      goal: 1000,
    }),
  ),
  define(
    "perfect_streak_5",
    "5 без ошибок",
    "5 идеальных раундов подряд",
    Flame,
    ({ userStats }) => ({
      current: Math.min(userStats?.best_streak ?? 0, 5),
      goal: 5,
    }),
  ),
  define(
    "perfect_streak_10",
    "Без права на ошибку",
    "10 идеальных раундов подряд",
    Zap,
    ({ userStats }) => ({
      current: Math.min(userStats?.best_streak ?? 0, 10),
      goal: 10,
    }),
  ),
  define(
    "all_modes",
    "Универсал",
    "Попробуй все 6 режимов",
    Trophy,
    ({ modeStats }) => {
      const modes = new Set(modeStats.map((m) => m.mode));
      return { current: modes.size, goal: 6 };
    },
  ),
  define(
    "multiplication_master",
    "Мастер умножения",
    "≥90% точности на ≥50 вопросов в умножении",
    X,
    ({ modeStats }) => {
      const rows = modeStats.filter((m) => m.mode === "multiplication");
      const totalQ = rows.reduce((a, r) => a + r.questions_count, 0);
      const totalC = rows.reduce((a, r) => a + r.correct_count, 0);
      const acc = totalQ > 0 ? totalC / totalQ : 0;
      const eligible = totalQ >= 50 && acc >= 0.9;
      return { current: eligible ? 1 : 0, goal: 1 };
    },
  ),
  define(
    "division_master",
    "Мастер деления",
    "≥90% точности на ≥50 вопросов в делении",
    Divide,
    ({ modeStats }) => {
      const rows = modeStats.filter((m) => m.mode === "division");
      const totalQ = rows.reduce((a, r) => a + r.questions_count, 0);
      const totalC = rows.reduce((a, r) => a + r.correct_count, 0);
      const acc = totalQ > 0 ? totalC / totalQ : 0;
      const eligible = totalQ >= 50 && acc >= 0.9;
      return { current: eligible ? 1 : 0, goal: 1 };
    },
  ),
  define(
    "sharp_shooter",
    "Снайпер",
    "≥95% точности на ≥100 вопросов",
    Award,
    ({ userStats }) => {
      const q = userStats?.total_questions ?? 0;
      const c = userStats?.total_correct ?? 0;
      const acc = q > 0 ? c / q : 0;
      const eligible = q >= 100 && acc >= 0.95;
      return { current: eligible ? 1 : 0, goal: 1 };
    },
  ),
];

export function isUnlocked(
  achievement: Achievement,
  ctx: AchievementContext,
): boolean {
  const p = achievement.progress(ctx);
  return p.current >= p.goal;
}

export function computeUnlockedCodes(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => isUnlocked(a, ctx)).map((a) => a.code);
}

export function getAchievement(code: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.code === code);
}
