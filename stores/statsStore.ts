"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { computeUnlockedCodes } from "@/lib/achievements";
import type { GameMode, Difficulty } from "@/types";

const SEEN_KEY = "achievements:seen";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* ignore */
  }
}

export interface AccountUser {
  id: string;
  email: string | null;
  createdAt: string | null;
}

export interface UserStatsRow {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  total_xp: number;
  current_streak: number;
  best_streak: number;
  streak_days: number;
  total_time_seconds?: number;
  last_session_at?: string | null;
}

export interface ModeStatsRow {
  mode: GameMode;
  difficulty: Difficulty;
  sessions_count: number;
  questions_count: number;
  correct_count: number;
  wrong_count: number;
}

export interface ActivityDay {
  date: string;
  sessions: number;
  questions: number;
  correct: number;
}

export interface ActivityData {
  since: string;
  weeks: number;
  days: ActivityDay[];
}

interface StatsState {
  user: AccountUser | null;
  userResolved: boolean;
  userStats: UserStatsRow | null;
  modeStats: ModeStatsRow[];
  activity: ActivityData | null;
  loading: boolean;
  activityLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  activityFetchedAt: number | null;
  newAchievements: string[];
  fetchUser: () => Promise<AccountUser | null>;
  fetchStats: (force?: boolean) => Promise<void>;
  fetchActivity: (force?: boolean) => Promise<void>;
  loadAll: (force?: boolean) => Promise<void>;
  dismissAchievement: (code: string) => void;
  reset: () => void;
}

const TTL_MS = 60_000;

export const useStatsStore = create<StatsState>((set, get) => ({
  user: null,
  userResolved: false,
  userStats: null,
  modeStats: [],
  activity: null,
  loading: false,
  activityLoading: false,
  error: null,
  lastFetchedAt: null,
  activityFetchedAt: null,
  newAchievements: [],

  dismissAchievement: (code) => {
    set({ newAchievements: get().newAchievements.filter((c) => c !== code) });
  },

  fetchUser: async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const account: AccountUser | null = user
      ? {
          id: user.id,
          email: user.email ?? null,
          createdAt: user.created_at ?? null,
        }
      : null;
    set({ user: account, userResolved: true });
    return account;
  },

  loadAll: async (force = false) => {
    const account = await get().fetchUser();
    if (!account) {
      set({
        userStats: null,
        modeStats: [],
        activity: null,
        lastFetchedAt: null,
        activityFetchedAt: null,
        loading: false,
        activityLoading: false,
        error: null,
      });
      return;
    }
    await Promise.all([get().fetchStats(force), get().fetchActivity(force)]);
  },

  fetchStats: async (force = false) => {
    const { lastFetchedAt, loading, user } = get();
    if (loading) return;
    if (!user) return;
    if (!force && lastFetchedAt && Date.now() - lastFetchedAt < TTL_MS) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (res.status === 401) {
        set({
          userStats: null,
          modeStats: [],
          loading: false,
          lastFetchedAt: Date.now(),
          error: null,
        });
        return;
      }
      if (!res.ok) {
        throw new Error("Не удалось загрузить статистику");
      }
      const data = await res.json();
      const nextUserStats = data.userStats || null;
      const nextModeStats = data.modeStats || [];

      // Detect newly unlocked achievements
      const unlocked = computeUnlockedCodes({
        userStats: nextUserStats,
        modeStats: nextModeStats,
      });
      const seen = loadSeen();
      const isFirstEverLoad = seen.size === 0;
      const fresh: string[] = [];
      for (const code of unlocked) {
        if (!seen.has(code)) {
          if (!isFirstEverLoad) fresh.push(code);
          seen.add(code);
        }
      }
      // Always persist; mark a sentinel so future loads aren't treated as first
      if (isFirstEverLoad) seen.add("__bootstrap__");
      saveSeen(seen);

      set({
        userStats: nextUserStats,
        modeStats: nextModeStats,
        loading: false,
        lastFetchedAt: Date.now(),
        error: null,
        newAchievements:
          fresh.length > 0
            ? [...get().newAchievements, ...fresh]
            : get().newAchievements,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Ошибка загрузки",
      });
    }
  },

  fetchActivity: async (force = false) => {
    const { activityFetchedAt, activityLoading, user } = get();
    if (activityLoading) return;
    if (!user) return;
    if (
      !force &&
      activityFetchedAt &&
      Date.now() - activityFetchedAt < TTL_MS
    ) {
      return;
    }

    set({ activityLoading: true });
    try {
      const res = await fetch("/api/activity", { cache: "no-store" });
      if (res.status === 401) {
        set({
          activity: null,
          activityLoading: false,
          activityFetchedAt: Date.now(),
        });
        return;
      }
      if (!res.ok) throw new Error("Не удалось загрузить активность");
      const data = (await res.json()) as ActivityData;
      set({
        activity: data,
        activityLoading: false,
        activityFetchedAt: Date.now(),
      });
    } catch {
      set({ activityLoading: false });
    }
  },

  reset: () => {
    set({
      user: null,
      userResolved: true,
      userStats: null,
      modeStats: [],
      activity: null,
      lastFetchedAt: null,
      activityFetchedAt: null,
      error: null,
      loading: false,
      activityLoading: false,
      newAchievements: [],
    });
  },
}));
