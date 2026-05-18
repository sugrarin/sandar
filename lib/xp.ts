/**
 * XP Calculation System for Math Trainer
 * 
 * Rules:
 * - Base XP per correct answer depends on difficulty:
 *   - easy: 10 XP
 *   - medium: 15 XP
 *   - hard: 20 XP
 *   - brain: 30 XP
 * - Streak bonus: +50 XP for every 5th consecutive perfect session
 *   (when all answers in a session are correct)
 * 
 * This file provides client-side calculation for preview/progress bars.
 * The actual XP is calculated server-side in the database trigger.
 */

import type { Difficulty } from "@/types";

// XP per correct answer by difficulty
export const XP_PER_ANSWER: Record<Difficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
  brain: 30,
};

// Bonus XP for every 5th consecutive perfect session
export const STREAK_BONUS_XP = 50;
export const STREAK_BONUS_INTERVAL = 5;

/**
 * Calculate base XP for a session based on correct answers and difficulty
 */
export function calculateBaseXP(
  correctCount: number,
  difficulty: Difficulty
): number {
  return correctCount * XP_PER_ANSWER[difficulty];
}

/**
 * Check if a session qualifies for streak bonus
 * - All answers must be correct (perfect session)
 * - Current streak (before this session) must be such that after +1, it's divisible by 5
 */
export function shouldAwardStreakBonus(
  isPerfectSession: boolean,
  currentStreak: number
): boolean {
  if (!isPerfectSession) return false;
  // currentStreak is streak BEFORE this session, so we check if +1 will be divisible by 5
  return currentStreak > 0 && (currentStreak + 1) % STREAK_BONUS_INTERVAL === 0;
}

/**
 * Calculate total XP for a session
 */
export function calculateSessionXP(
  correctCount: number,
  totalCount: number,
  difficulty: Difficulty,
  currentStreak: number
): { baseXP: number; bonusXP: number; totalXP: number } {
  const baseXP = calculateBaseXP(correctCount, difficulty);
  const isPerfectSession = correctCount === totalCount;
  const bonusXP = shouldAwardStreakBonus(isPerfectSession, currentStreak)
    ? STREAK_BONUS_XP
    : 0;
  return {
    baseXP,
    bonusXP,
    totalXP: baseXP + bonusXP,
  };
}

/**
 * Calculate streak days based on last session date
 * - If no previous session: start at 1
 * - If last session was yesterday: increment streak
 * - If last session was today: maintain streak
 * - If last session was before yesterday: reset to 1
 */
export function calculateStreakDays(
  lastSessionDate: string | null | undefined,
  currentStreakDays: number
): number {
  if (!lastSessionDate) return 1;

  const lastDate = new Date(lastSessionDate);
  const today = new Date();
  
  // Normalize to date only (remove time component)
  const lastDateOnly = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffDays = Math.floor((todayOnly.getTime() - lastDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Already trained today, maintain streak
    return currentStreakDays;
  } else if (diffDays === 1) {
    // Last session was yesterday, increment streak
    return currentStreakDays + 1;
  } else {
    // Streak broken, start fresh
    return 1;
  }
}

/**
 * Format XP with thousand separators
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString("ru-RU");
}

/**
 * Get XP progress to next level (every 1000 XP = new level)
 */
export function getLevelProgress(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progressPercent: number;
} {
  const XP_PER_LEVEL = 1000;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const currentLevelXP = totalXP % XP_PER_LEVEL;
  const xpToNextLevel = XP_PER_LEVEL - currentLevelXP;
  const progressPercent = (currentLevelXP / XP_PER_LEVEL) * 100;
  
  return {
    level,
    currentLevelXP,
    xpToNextLevel,
    progressPercent,
  };
}
