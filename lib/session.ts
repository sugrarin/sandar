import { createClient } from './supabase/client';
import type { SessionAnswer, GameMode, Difficulty } from '@/types';

interface SessionData {
  mode: GameMode;
  difficulty: Difficulty;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  durationSeconds: number;
  answers: SessionAnswer[];
}

export async function saveSession(sessionData: SessionData): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Store locally for later sync
    const pendingSessions = JSON.parse(localStorage.getItem('pendingSessions') || '[]');
    pendingSessions.push({
      ...sessionData,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));
    return { success: true };
  }

  try {
    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        mode: sessionData.mode,
        difficulty: sessionData.difficulty,
        total_questions: sessionData.totalQuestions,
        correct_answers: sessionData.correctAnswers,
        wrong_answers: sessionData.wrongAnswers,
        duration_seconds: sessionData.durationSeconds,
        completed_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (sessionError) throw sessionError;

    // Insert answers if any
    if (sessionData.answers.length > 0) {
      const answersData = sessionData.answers.map(answer => ({
        session_id: session.id,
        question: answer.question,
        correct_answer: answer.correctAnswer,
        user_answer: answer.userAnswer,
        is_correct: answer.isCorrect,
        time_spent_seconds: answer.timeSpentSeconds || 0
      }));

      const { error: answersError } = await supabase
        .from('session_answers')
        .insert(answersData);

      if (answersError) throw answersError;
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save session:', error);
    return { success: false, error: 'Failed to save session' };
  }
}

export async function syncPendingSessions(): Promise<{ synced: number; failed: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { synced: 0, failed: 0 };

  const pendingSessions = JSON.parse(localStorage.getItem('pendingSessions') || '[]');
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

  localStorage.setItem('pendingSessions', JSON.stringify(failed));
  return { synced, failed: failed.length };
}

export async function getUserStats() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) return null;
  return data;
}

export async function getModeStats() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('mode_stats')
    .select('*')
    .eq('user_id', user.id);

  if (error) return [];
  return data || [];
}

export async function getRecentSessions(limit = 10) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}
