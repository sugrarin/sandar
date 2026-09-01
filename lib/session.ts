import { createClient } from "./supabase/client";
import { buildSessionRequest } from "./sessionPayload";
import type { CompletedSession } from "@/types";

const MAX_PENDING = 50;

function readPendingSessions(): CompletedSession[] {
  try {
    const value = JSON.parse(localStorage.getItem("pendingSessions") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function saveSession(
  sessionData: CompletedSession,
): Promise<{ success: boolean; error?: string }> {
  // Error-review rounds are practice and must not inflate progress statistics.
  const requestBody = buildSessionRequest(sessionData);
  if (!requestBody) {
    return { success: true };
  }

  const supabase = createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const pendingSessions = readPendingSessions();
    pendingSessions.push(sessionData);
    localStorage.setItem(
      "pendingSessions",
      JSON.stringify(pendingSessions.slice(-MAX_PENDING)),
    );
    return { success: true };
  }

  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Session API returned ${response.status}`);
    }

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

  const pendingSessions = readPendingSessions();
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
