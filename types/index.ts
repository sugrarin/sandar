export type GameMode =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "table"
  | "mixed"
  | "review";
export type Difficulty = "easy" | "medium" | "hard" | "brain";

export interface Task {
  question: string;
  answer: number;
  options: number[];
  operation: GameMode;
  left: number;
  right: number;
  subtitle?: string;
}

export interface SessionAnswer {
  question: string;
  correctAnswer: number;
  userAnswer: number;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

export interface GameSession {
  id: string;
  sourceMode: GameMode;
  mode: GameMode;
  difficulty: Difficulty;
  index: number;
  total: number;
  score: number;
  tasks: Task[];
  mistakes: Task[];
  status: "playing" | "completed";
  allowAdvance: boolean;
  lastAnswer: number | null;
  reviewQueue: Task[];
  startTime?: number;
  questionStartedAt?: number;
}

export interface CompletedSession {
  sourceMode: GameMode;
  mode: GameMode;
  difficulty: Difficulty;
  score: number;
  total: number;
  mistakes: Task[];
  answers: SessionAnswer[];
  durationSeconds: number;
  finishedAt: number;
}

export interface UserStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalTimeSeconds: number;
  currentStreak: number;
  bestStreak: number;
  lastSessionAt: string | null;
}

export interface ModeStats {
  mode: GameMode;
  difficulty: Difficulty;
  sessionsCount: number;
  questionsCount: number;
  correctCount: number;
  wrongCount: number;
}

export interface DifficultyProfile {
  label: string;
  emoji: string;
  addition: { min: number; max: number };
  subtraction: { min: number; max: number };
  multiplication: { left: [number, number]; right: [number, number] };
  division: { divisor: [number, number]; quotient: [number, number] };
}

export const MODE_LABELS: Record<GameMode, string> = {
  addition: "Сложение",
  subtraction: "Вычитание",
  multiplication: "Умножение",
  division: "Деление",
  mixed: "Всё подряд",
  table: "Таблица умножения",
  review: "Разбор ошибок",
};

export const OPERATION_SYMBOLS: Record<string, string> = {
  addition: "+",
  subtraction: "−",
  multiplication: "×",
  division: "÷",
};

export const DIFFICULTIES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    label: "1 знак",
    emoji: "👶🏻",
    addition: { min: 1, max: 10 },
    subtraction: { min: 1, max: 10 },
    multiplication: { left: [1, 10], right: [1, 10] },
    division: { divisor: [1, 10], quotient: [1, 10] },
  },
  medium: {
    label: "2 знака",
    emoji: "👦🏻",
    addition: { min: 10, max: 99 },
    subtraction: { min: 10, max: 99 },
    multiplication: { left: [2, 19], right: [2, 9] },
    division: { divisor: [2, 9], quotient: [2, 19] },
  },
  hard: {
    label: "До 3 знаков",
    emoji: "👴🏻",
    addition: { min: 100, max: 999 },
    subtraction: { min: 100, max: 999 },
    multiplication: { left: [10, 50], right: [2, 15] },
    division: { divisor: [2, 15], quotient: [10, 50] },
  },
  brain: {
    label: "До 4 знаков",
    emoji: "🧠",
    addition: { min: 1000, max: 9999 },
    subtraction: { min: 1000, max: 9999 },
    multiplication: { left: [10, 99], right: [10, 50] },
    division: { divisor: [10, 50], quotient: [10, 99] },
  },
};

export interface ShareCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  is_active: boolean;
}

export interface ShareAccess {
  id: string;
  share_code_id: string;
  viewer_id: string;
  viewer_email: string;
  viewer_display_name: string;
  viewer_avatar_url: string | null;
  activated_at: string;
  is_active: boolean;
}
