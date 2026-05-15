import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user stats
  const { data: userStats, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (statsError && statsError.code !== 'PGRST116') {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  // Get mode stats
  const { data: modeStats, error: modeError } = await supabase
    .from('mode_stats')
    .select('*')
    .eq('user_id', user.id);

  if (modeError) {
    return NextResponse.json({ error: modeError.message }, { status: 500 });
  }

  return NextResponse.json({
    userStats: userStats || {
      total_sessions: 0,
      total_questions: 0,
      total_correct: 0,
      total_wrong: 0,
      current_streak: 0,
      best_streak: 0
    },
    modeStats: modeStats || []
  });
}
