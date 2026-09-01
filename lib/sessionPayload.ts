import type {
  CompletedSession,
  Difficulty,
  GameMode,
  SessionAnswer,
} from "@/types";

export interface SessionRequest {
  mode: Exclude<GameMode, "review">;
  difficulty: Difficulty;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  durationSeconds: number;
  completedAt: string;
  answers: SessionAnswer[];
}

export function buildSessionRequest(
  session: CompletedSession,
): SessionRequest | null {
  if (session.mode === "review") return null;

  return {
    mode: session.mode,
    difficulty: session.difficulty,
    totalQuestions: session.total,
    correctAnswers: session.score,
    wrongAnswers: session.mistakes.length,
    durationSeconds: session.durationSeconds ?? 0,
    completedAt: new Date(session.finishedAt).toISOString(),
    answers: session.answers ?? [],
  };
}
