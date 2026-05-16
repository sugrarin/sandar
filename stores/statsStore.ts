"use client";

import { create } from "zustand";
import type { GameMode, Difficulty } from "@/types";

export interface UserStatsRow {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  current_streak: number;
  best_streak: number;
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

interface StatsState {
  userStats: UserStatsRow | null;
  modeStats: ModeStatsRow[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchStats: (force?: boolean) => Promise<void>;
  invalidate: () => void;
  reset: () => void;
}

const TTL_MS = 60_000;

export const useStatsStore = create<StatsState>((set, get) => ({
  userStats: null,
  modeStats: [],
  loading: false,
  error: null,
  lastFetchedAt: null,

  fetchStats: async (force = false) => {
    const { lastFetchedAt, loading } = get();
    if (loading) return;
    if (
      !force &&
      lastFetchedAt &&
      Date.now() - lastFetchedAt < TTL_MS
    ) {
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
      set({
        userStats: data.userStats || null,
        modeStats: data.modeStats || [],
        loading: false,
        lastFetchedAt: Date.now(),
        error: null,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Ошибка загрузки",
      });
    }
  },

  invalidate: () => {
    set({ lastFetchedAt: null });
  },

  reset: () => {
    set({
      userStats: null,
      modeStats: [],
      lastFetchedAt: null,
      error: null,
      loading: false,
    });
  },
}));
