import { describe, expect, it } from "vitest";
import { buildSessionRequest } from "@/lib/sessionPayload";
import type { CompletedSession } from "@/types";

function makeSession(
  overrides: Partial<CompletedSession> = {},
): CompletedSession {
  return {
    sourceMode: "addition",
    mode: "addition",
    difficulty: "easy",
    score: 1,
    total: 1,
    mistakes: [],
    answers: [
      {
        question: "1 + 1",
        correctAnswer: 2,
        userAnswer: 2,
        isCorrect: true,
        timeSpentSeconds: 3,
      },
    ],
    durationSeconds: 3,
    finishedAt: Date.UTC(2026, 5, 5, 12),
    ...overrides,
  };
}

describe("buildSessionRequest", () => {
  it("keeps duration and detailed answers", () => {
    const request = buildSessionRequest(makeSession());
    expect(request).toMatchObject({
      totalQuestions: 1,
      correctAnswers: 1,
      wrongAnswers: 0,
      durationSeconds: 3,
      answers: [{ timeSpentSeconds: 3 }],
    });
  });

  it("does not persist review rounds", () => {
    expect(buildSessionRequest(makeSession({ mode: "review" }))).toBeNull();
  });
});
