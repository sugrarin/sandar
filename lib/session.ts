import { createClient } from "./supabase/client";
import type { SessionAnswer, GameMode, Difficulty } from "@/types";

interface SessionData {
  sourceMode: GameMode;
  mode: GameMode;
  difficulty: Difficulty;
  score: number;
  total: number;
  mistakes: {
    question: string;
    answer: number;
    options: number[];
    operation: GameMode;
    left: number;
    right: number;
  }[];
  finishedAt: number;
}

export async function saveSession(
  sessionData: SessionData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const MAX_PENDING = 50;
    const pendingSessions = JSON.parse(
      localStorage.getItem("pendingSessions") || "[]",
    );
    pendingSessions.push({ ...sessionData, timestamp: new Date().toISOString() });
    localStorage.setItem("pendingSessions", JSON.stringify(pendingSessions.slice(-MAX_PENDING)));
    return { success: true };
  }

  try {
    // Insert session
    const wrongCount = sessionData.mistakes.length;
    const correctCount = sessionData.score;
    const totalCount = sessionData.total;

    const { error: sessionError } = await supabase.from("sessions").insert({
      user_id: user.id,
      mode: sessionData.mode,
      difficulty: sessionData.difficulty,
      total_questions: totalCount,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      completed_at: new Date(sessionData.finishedAt).toISOString(),
    });

    if (sessionError) throw sessionError;

    return { success: true };
  } catch (error) {
    console.error("Failed to save session:", error);
    return { success: false, error: "Failed to save session" };
  }
}

export async function syncPendingSessions(): Promise<{
  synced: number;
  failed: number;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { synced: 0, failed: 0 };

  const pendingSessions = JSON.parse(
    localStorage.getItem("pendingSessions") || "[]",
  );
  if (pendingSessions.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  const failed: typeof pendingSessions = [];

  for (const session of pendingSessions) {
    const { success } = await saveSession(session);
    if (success) {
      synced++;
    } else {
      failed.push(session);
    }
  }

  localStorage.setItem("pendingSessions", JSON.stringify(failed));
  return { synced, failed: failed.length };
}

export async function getUserStats() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function getModeStats() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("mode_stats")
    .select("*")
    .eq("user_id", user.id);

  if (error) return [];
  return data || [];
}

export async function getRecentSessions(limit = 10) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}
