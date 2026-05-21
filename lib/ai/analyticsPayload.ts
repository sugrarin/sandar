import { useStatsStore, type ModeStatsRow, type UserStatsRow } from "@/stores/statsStore";
import type { GameMode } from "@/types";

export interface OperationStat {
  solved: number;
  mistakes: number;
  accuracy: number;
}

export interface AnalyticsPayload {
  totalTrainings: number;
  totalExamples: number;
  accuracy: number;
  mistakes: number;
  operationsStats: {
    addition: OperationStat;
    subtraction: OperationStat;
    multiplication: OperationStat;
    division: OperationStat;
  };
}

const OPERATION_MODES: GameMode[] = ["addition", "subtraction", "multiplication", "division"];

function computeOperationStats(modeStats: ModeStatsRow[]): Record<string, OperationStat> {
  const result: Record<string, OperationStat> = {};

  for (const mode of OPERATION_MODES) {
    const rows = modeStats.filter((r) => r.mode === mode);
    const solved = rows.reduce((sum, r) => sum + r.questions_count, 0);
    const mistakes = rows.reduce((sum, r) => sum + r.wrong_count, 0);
    const accuracy = solved > 0 ? Math.round(((solved - mistakes) / solved) * 100) : 0;
    result[mode] = { solved, mistakes, accuracy };
  }

  return result;
}

export function buildAnalyticsPayload(): AnalyticsPayload | null {
  const { userStats, modeStats } = useStatsStore.getState();

  if (!userStats) return null;

  const totalQuestions = userStats.total_questions ?? 0;
  const totalCorrect = userStats.total_correct ?? 0;
  const totalWrong = userStats.total_wrong ?? 0;

  if (totalQuestions === 0) return null;

  const opsStats = computeOperationStats(modeStats);

  return {
    totalTrainings: userStats.total_sessions ?? 0,
    totalExamples: totalQuestions,
    accuracy: Math.round((totalCorrect / totalQuestions) * 100),
    mistakes: totalWrong,
    operationsStats: {
      addition: opsStats.addition,
      subtraction: opsStats.subtraction,
      multiplication: opsStats.multiplication,
      division: opsStats.division,
    },
  };
}

export function computeStatsHash(payload: AnalyticsPayload): string {
  const { totalTrainings, totalExamples, accuracy, mistakes, operationsStats } = payload;
  const opsHash = Object.values(operationsStats)
    .map((o) => `${o.solved}:${o.mistakes}:${o.accuracy}`)
    .join("|");
  return `${totalTrainings}:${totalExamples}:${accuracy}:${mistakes}:${opsHash}`;
}
