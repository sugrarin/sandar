import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      mode,
      difficulty,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      durationSeconds,
      answers
    } = body;

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        mode,
        difficulty,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        duration_seconds: durationSeconds,
        completed_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Insert answers if provided
    if (answers && answers.length > 0) {
      const answersData = answers.map((answer: {
        question: string;
        correctAnswer: number;
        userAnswer: number;
        isCorrect: boolean;
        timeSpentSeconds?: number;
      }) => ({
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

      if (answersError) {
        console.error('Failed to insert answers:', answersError);
      }
    }

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}
