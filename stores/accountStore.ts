"use client";

import { create } from "zustand";
import type { ShareAccess } from "@/types";

export interface LinkedStudent {
  id: string;
  student_id: string;
  student_email: string;
  student_display_name: string | null;
  student_avatar_url: string | null;
  activated_at: string;
}

export interface StudentStatsData {
  profile: any;
  userStats: any;
  modeStats: any[];
  activity: any[];
  accessId: string | null;
}

interface StudentCacheEntry {
  status: "loading" | "ready" | "error";
  data: StudentStatsData | null;
  error: string | null;
}

interface AccountState {
  // Share code (student tab)
  shareCode: string;
  isGeneratingCode: boolean;
  hasLoadedCode: boolean;

  // Connections / viewers (student tab)
  viewers: ShareAccess[];
  isLoadingConnections: boolean;
  hasLoadedConnections: boolean;

  // Linked students (parent tab)
  students: LinkedStudent[];
  isLoadingStudents: boolean;
  hasLoadedStudents: boolean;

  // Student statistics cache (for prefetch + StudentStatsView)
  studentStatisticsCache: Record<string, StudentCacheEntry>;

  // Actions
  loadShareCode: () => Promise<void>;
  loadConnections: () => Promise<void>;
  loadStudents: () => Promise<void>;
  loadAccountSession: () => Promise<void>;
  prefetchStudentStatistics: (studentId: string) => void;
  prefetchAllStudentStatistics: () => void;
  getStudentStats: (studentId: string) => StudentCacheEntry | undefined;
  refreshConnections: () => Promise<void>;
  refreshStudents: () => Promise<void>;
  clearSession: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  shareCode: "",
  isGeneratingCode: false,
  hasLoadedCode: false,

  viewers: [],
  isLoadingConnections: false,
  hasLoadedConnections: false,

  students: [],
  isLoadingStudents: false,
  hasLoadedStudents: false,

  studentStatisticsCache: {},

  loadShareCode: async () => {
    const { hasLoadedCode, isGeneratingCode } = get();
    if (hasLoadedCode || isGeneratingCode) return;

    set({ isGeneratingCode: true });
    try {
      const res = await fetch("/api/share/code");
      const data = await res.json();
      if (data.code) {
        set({ shareCode: data.code, hasLoadedCode: true });
      }
    } catch (err) {
      console.error("Failed to fetch share code:", err);
    } finally {
      set({ isGeneratingCode: false });
    }
  },

  loadConnections: async () => {
    const { hasLoadedConnections, isLoadingConnections } = get();
    if (hasLoadedConnections || isLoadingConnections) return;

    set({ isLoadingConnections: true });
    try {
      const res = await fetch("/api/share/access");
      const data = await res.json();
      if (data.access) {
        set({ viewers: data.access, hasLoadedConnections: true });
      }
    } catch (err) {
      console.error("Failed to fetch viewers:", err);
    } finally {
      set({ isLoadingConnections: false });
    }
  },

  loadStudents: async () => {
    const { hasLoadedStudents, isLoadingStudents } = get();
    if (hasLoadedStudents || isLoadingStudents) return;

    set({ isLoadingStudents: true });
    try {
      const res = await fetch("/api/share/viewed");
      const data = await res.json();
      if (data.students) {
        set({
          students: data.students,
          hasLoadedStudents: true,
        });
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      set({ isLoadingStudents: false });
    }
  },

  loadAccountSession: async () => {
    const { hasLoadedCode, hasLoadedConnections, hasLoadedStudents } = get();

    const promises: Promise<void>[] = [];
    if (!hasLoadedCode || !hasLoadedConnections) {
      promises.push(
        get().loadShareCode(),
        get().loadConnections(),
      );
    }
    if (!hasLoadedStudents) {
      promises.push(get().loadStudents());
    }

    await Promise.all(promises);

    // After students load, start prefetching statistics
    const state = get();
    if (state.hasLoadedStudents && state.students.length > 0) {
      get().prefetchAllStudentStatistics();
    }
  },

  prefetchStudentStatistics: (studentId: string) => {
    const cache = get().studentStatisticsCache[studentId];
    if (cache && (cache.status === "loading" || cache.status === "ready")) return;

    set((state) => ({
      studentStatisticsCache: {
        ...state.studentStatisticsCache,
        [studentId]: { status: "loading", data: null, error: null },
      },
    }));

    const load = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetch(`/api/share/student/${studentId}/profile`),
          fetch(`/api/share/student/${studentId}/stats`),
        ]);

        if (!profileRes.ok || !statsRes.ok) {
          throw new Error("Failed to fetch student data");
        }

        const profileData = await profileRes.json();
        const statsData = await statsRes.json();

        const [modeRes, activityRes, accessRes] = await Promise.allSettled([
          fetch(`/api/share/student/${studentId}/mode-stats`),
          fetch(`/api/share/student/${studentId}/activity`),
          fetch(`/api/share/student/${studentId}/access-id`),
        ]);

        let modeStats: any[] = [];
        let activity: any[] = [];
        let accessId: string | null = null;

        if (modeRes.status === "fulfilled" && modeRes.value.ok) {
          const modeData = await modeRes.value.json();
          modeStats = modeData.mode_stats || [];
        }
        if (activityRes.status === "fulfilled" && activityRes.value.ok) {
          const activityData = await activityRes.value.json();
          activity = activityData.activity || [];
        }
        if (accessRes.status === "fulfilled" && accessRes.value.ok) {
          const accessData = await accessRes.value.json();
          accessId = accessData.access_id || null;
        }

        set((state) => ({
          studentStatisticsCache: {
            ...state.studentStatisticsCache,
            [studentId]: {
              status: "ready",
              data: { profile: profileData, userStats: statsData, modeStats, activity, accessId },
              error: null,
            },
          },
        }));
      } catch (err: any) {
        set((state) => ({
          studentStatisticsCache: {
            ...state.studentStatisticsCache,
            [studentId]: {
              status: "error",
              data: null,
              error: err?.message || "Failed to load student statistics",
            },
          },
        }));
      }
    };

    load();
  },

  prefetchAllStudentStatistics: () => {
    const { students } = get();
    for (const student of students) {
      get().prefetchStudentStatistics(student.student_id);
    }
  },

  getStudentStats: (studentId: string) => {
    return get().studentStatisticsCache[studentId];
  },

  refreshConnections: async () => {
    set({ isLoadingConnections: true, hasLoadedConnections: false });
    try {
      const res = await fetch("/api/share/access");
      const data = await res.json();
      if (data.access) {
        set({ viewers: data.access, hasLoadedConnections: true });
      }
    } catch (err) {
      console.error("Failed to refresh viewers:", err);
    } finally {
      set({ isLoadingConnections: false });
    }
  },

  refreshStudents: async () => {
    set({ isLoadingStudents: true, hasLoadedStudents: false });
    try {
      const res = await fetch("/api/share/viewed");
      const data = await res.json();
      if (data.students) {
        set({ students: data.students, hasLoadedStudents: true });
        get().prefetchAllStudentStatistics();
      }
    } catch (err) {
      console.error("Failed to refresh students:", err);
    } finally {
      set({ isLoadingStudents: false });
    }
  },

  clearSession: () => {
    set({
      shareCode: "",
      isGeneratingCode: false,
      hasLoadedCode: false,
      viewers: [],
      isLoadingConnections: false,
      hasLoadedConnections: false,
      students: [],
      isLoadingStudents: false,
      hasLoadedStudents: false,
      studentStatisticsCache: {},
    });
  },
}));
