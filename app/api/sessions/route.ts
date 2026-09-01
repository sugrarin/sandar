import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SessionRequest } from "@/lib/sessionPayload";
import type { Difficulty, GameMode, SessionAnswer } from "@/types";

export const dynamic = "force-dynamic";

const SESSION_MODES: GameMode[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "table",
  "mixed",
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "brain"];

function isSessionAnswer(value: unknown): value is SessionAnswer {
  if (!value || typeof value !== "object") return false;
  const answer = value as Partial<SessionAnswer>;
  return (
    typeof answer.question === "string" &&
    Number.isFinite(answer.correctAnswer) &&
    Number.isFinite(answer.userAnswer) &&
    typeof answer.isCorrect === "boolean" &&
    (answer.timeSpentSeconds === undefined ||
      (Number.isFinite(answer.timeSpentSeconds) &&
        answer.timeSpentSeconds >= 0))
  );
}

function isSessionRequest(value: unknown): value is SessionRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<SessionRequest>;
  return (
    SESSION_MODES.includes(body.mode as GameMode) &&
    DIFFICULTIES.includes(body.difficulty as Difficulty) &&
    Number.isInteger(body.totalQuestions) &&
    (body.totalQuestions ?? 0) > 0 &&
    Number.isInteger(body.correctAnswers) &&
    (body.correctAnswers ?? -1) >= 0 &&
    Number.isInteger(body.wrongAnswers) &&
    (body.wrongAnswers ?? -1) >= 0 &&
    body.correctAnswers! + body.wrongAnswers! === body.totalQuestions &&
    Number.isFinite(body.durationSeconds) &&
    (body.durationSeconds ?? -1) >= 0 &&
    typeof body.completedAt === "string" &&
    !Number.isNaN(Date.parse(body.completedAt)) &&
    Array.isArray(body.answers) &&
    (body.answers.length === 0 || body.answers.length === body.totalQuestions) &&
    body.answers.every(isSessionAnswer)
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    if (!isSessionRequest(body)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        mode: body.mode,
        difficulty: body.difficulty,
        total_questions: body.totalQuestions,
        correct_answers: body.correctAnswers,
        wrong_answers: body.wrongAnswers,
        duration_seconds: Math.round(body.durationSeconds),
        completed_at: body.completedAt,
      })
      .select("id")
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Insert answers if provided
    if (body.answers.length > 0) {
      const answersData = body.answers.map((answer) => ({
        session_id: session.id,
        question: answer.question,
        correct_answer: answer.correctAnswer,
        user_answer: answer.userAnswer,
        is_correct: answer.isCorrect,
        time_spent_seconds: answer.timeSpentSeconds ?? 0,
      }));

      const { error: answersError } = await supabase
        .from("session_answers")
        .insert(answersData);

      if (answersError) {
        console.error("Failed to insert answers:", answersError);
        return NextResponse.json(
          { error: "Failed to save answers" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("Error saving session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}
