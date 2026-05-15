'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameMode, Difficulty, Task, GameSession, SessionAnswer } from '@/types';
import { DIFFICULTIES, MODE_LABELS, OPERATION_SYMBOLS } from '@/types';

const THIN_SPACE = '\u2009';
const ROUND_SIZE = 12;
const REVIEW_ROUND_ID = 'review';

interface GameState {
  settings: {
    difficulty: Difficulty;
  };
  activeRound: GameSession | null;
  lastSession: {
    sourceMode: GameMode;
    mode: GameMode;
    difficulty: Difficulty;
    score: number;
    total: number;
    mistakes: Task[];
    finishedAt: number;
  } | null;
  answers: SessionAnswer[];

  // Actions
  setDifficulty: (difficulty: Difficulty) => void;
  startRound: (mode: GameMode) => void;
  startReviewRound: () => void;
  replayCurrentMode: () => void;
  handleAnswer: (selected: number) => { isCorrect: boolean; shouldAdvance: boolean };
  advanceRound: () => void;
  finishCurrentRound: () => void;
  returnHome: () => void;
  getCurrentTask: () => Task | null;
  generateTask: (mode: GameMode, difficultyId: Difficulty) => Task;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDifficultyProfile(difficultyId: Difficulty): Difficulty {
  const blend: Record<string, { current: number; previous: Difficulty }> = {
    hard: { current: 0.8, previous: 'medium' },
    brain: { current: 0.8, previous: 'hard' }
  };

  const b = blend[difficultyId];
  if (!b) return difficultyId;

  return Math.random() < b.current ? difficultyId : b.previous;
}

function createOptions(answer: number): number[] {
  const options = new Set([answer]);
  const offsets = shuffle([1, -1, 10, -10]);

  for (const offset of offsets) {
    const candidate = Math.abs(answer + offset);
    if (candidate !== answer && options.size < 4) {
      options.add(candidate);
    }
  }

  // Transpose digits for 2+ digit numbers
  const digits = String(Math.abs(answer));
  if (digits.length >= 2) {
    const transposed = digits.length === 2
      ? digits[1] + digits[0]
      : digits.slice(0, -2) + digits[digits.length - 1] + digits[digits.length - 2];
    const tNum = Number(transposed);
    if (tNum !== answer) options.add(tNum);
  }

  // Fill remaining slots
  let attempts = 0;
  while (options.size < 4 && attempts < 20) {
    const jitter = randomInt(
      -Math.max(3, Math.ceil(Math.abs(answer) * 0.2)),
      Math.max(3, Math.ceil(Math.abs(answer) * 0.2))
    );
    const candidate = Math.max(0, answer + jitter);
    if (candidate !== answer) options.add(candidate);
    attempts++;
  }

  return shuffle(Array.from(options).slice(0, 4));
}

function formatTask(operation: GameMode, left: number, right: number, answer: number, subtitle?: string): Task {
  const symbol = OPERATION_SYMBOLS[operation] || '+';
  const question = `${left}${THIN_SPACE}${symbol}${THIN_SPACE}${right}`;

  return {
    question,
    answer,
    options: createOptions(answer),
    operation,
    left,
    right,
    subtitle: subtitle || MODE_LABELS[operation]
  };
}

function buildAdditionTask(profile: typeof DIFFICULTIES.easy): Task {
  const left = randomInt(profile.addition.min, profile.addition.max);
  const right = randomInt(profile.addition.min, profile.addition.max);
  return formatTask('addition', left, right, left + right);
}

function buildSubtractionTask(profile: typeof DIFFICULTIES.easy): Task {
  const a = randomInt(profile.subtraction.min, profile.subtraction.max);
  const b = randomInt(profile.subtraction.min, profile.subtraction.max);
  const left = Math.max(a, b);
  const right = Math.min(a, b);
  return formatTask('subtraction', left, right, left - right);
}

function buildMultiplicationTask(profile: typeof DIFFICULTIES.easy): Task {
  const left = randomInt(profile.multiplication.left[0], profile.multiplication.left[1]);
  const right = randomInt(profile.multiplication.right[0], profile.multiplication.right[1]);
  return formatTask('multiplication', left, right, left * right);
}

function buildDivisionTask(profile: typeof DIFFICULTIES.easy): Task {
  const divisor = randomInt(profile.division.divisor[0], profile.division.divisor[1]);
  const quotient = randomInt(profile.division.quotient[0], profile.division.quotient[1]);
  return formatTask('division', divisor * quotient, divisor, quotient);
}

function buildTableTask(): Task {
  const left = randomInt(1, 10);
  const right = randomInt(1, 10);
  return formatTask('multiplication', left, right, left * right, 'Таблица умножения');
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      settings: { difficulty: 'easy' },
      activeRound: null,
      lastSession: null,
      answers: [],

      setDifficulty: (difficulty) => {
        set((state) => ({
          settings: { ...state.settings, difficulty }
        }));
      },

      startRound: (mode) => {
        const difficulty = get().settings.difficulty;
        const tasks: Task[] = [];

        for (let i = 0; i < ROUND_SIZE; i++) {
          tasks.push(get().generateTask(mode, difficulty));
        }

        set({
          activeRound: {
            id: String(Date.now()),
            sourceMode: mode,
            mode,
            difficulty,
            index: 0,
            total: ROUND_SIZE,
            score: 0,
            tasks,
            mistakes: [],
            status: 'playing',
            allowAdvance: false,
            lastAnswer: null,
            reviewQueue: [],
            startTime: Date.now()
          },
          answers: []
        });
      },

      startReviewRound: () => {
        const session = get().lastSession;
        if (!session || session.mistakes.length === 0) return;

        const mistakes = session.mistakes.map(m => ({ ...m }));

        set({
          activeRound: {
            id: REVIEW_ROUND_ID,
            sourceMode: session.sourceMode,
            mode: 'review',
            difficulty: session.difficulty,
            index: 0,
            total: mistakes.length,
            score: 0,
            tasks: [...mistakes],
            mistakes: [],
            status: 'playing',
            allowAdvance: false,
            lastAnswer: null,
            reviewQueue: mistakes,
            startTime: Date.now()
          },
          answers: []
        });
      },

      replayCurrentMode: () => {
        const mode = get().lastSession?.sourceMode || 'mixed';
        get().startRound(mode);
      },

      handleAnswer: (selected) => {
        const round = get().activeRound;
        if (!round) return { isCorrect: false, shouldAdvance: false };

        const task = round.mode === 'review'
          ? round.reviewQueue[0]
          : round.tasks[round.index];

        if (!task) return { isCorrect: false, shouldAdvance: false };

        if (round.allowAdvance) {
          return { isCorrect: false, shouldAdvance: true };
        }

        const isCorrect = selected === task.answer;
        const timeSpent = round.startTime
          ? Math.floor((Date.now() - round.startTime) / 1000)
          : undefined;

        const answer: SessionAnswer = {
          question: task.question,
          correctAnswer: task.answer,
          userAnswer: selected,
          isCorrect,
          timeSpentSeconds: timeSpent
        };

        set((state) => ({
          answers: [...state.answers, answer],
          activeRound: {
            ...round,
            lastAnswer: selected,
            allowAdvance: !isCorrect,
            score: isCorrect ? round.score + 1 : round.score,
            mistakes: !isCorrect
              ? [...round.mistakes, { ...task, selected } as Task]
              : round.mistakes
          }
        }));

        return { isCorrect, shouldAdvance: isCorrect };
      },

      advanceRound: () => {
        const round = get().activeRound;
        if (!round) return;

        if (round.mode === 'review') {
          round.reviewQueue.shift();
        } else {
          round.index++;
        }

        const hasMoreTasks = round.mode === 'review'
          ? round.reviewQueue.length > 0
          : round.index < round.tasks.length;

        if (!hasMoreTasks) {
          // Finish round
          const duration = round.startTime
            ? Math.floor((Date.now() - round.startTime) / 1000)
            : 0;

          set({
            lastSession: {
              sourceMode: round.sourceMode,
              mode: round.mode,
              difficulty: round.difficulty,
              score: round.score,
              total: round.total,
              mistakes: round.mistakes,
              finishedAt: Date.now()
            },
            activeRound: null
          });

          return { type: 'finished', duration };
        }

        set({
          activeRound: {
            ...round,
            allowAdvance: false,
            lastAnswer: null
          }
        });

        return { type: 'advanced' };
      },

      finishCurrentRound: () => {
        const round = get().activeRound;
        if (!round) return;

        const duration = round.startTime
          ? Math.floor((Date.now() - round.startTime) / 1000)
          : 0;

        set({
          lastSession: {
            sourceMode: round.sourceMode,
            mode: round.mode,
            difficulty: round.difficulty,
            score: round.score,
            total: round.total,
            mistakes: round.mistakes,
            finishedAt: Date.now()
          },
          activeRound: null
        });

        return { duration };
      },

      returnHome: () => {
        set({ activeRound: null });
      },

      getCurrentTask: () => {
        const round = get().activeRound;
        if (!round) return null;

        if (round.mode === 'review') {
          return round.reviewQueue[0] || null;
        }
        return round.tasks[round.index] || null;
      },

      generateTask: (mode, difficultyId) => {
        if (mode === 'mixed') {
          const modes: GameMode[] = ['addition', 'subtraction', 'multiplication', 'division'];
          return get().generateTask(modes[randomInt(0, modes.length - 1)], difficultyId);
        }

        if (mode === 'table') {
          return buildTableTask();
        }

        const effectiveDifficulty = pickDifficultyProfile(difficultyId);
        const profile = DIFFICULTIES[effectiveDifficulty];

        switch (mode) {
          case 'addition':
            return buildAdditionTask(profile);
          case 'subtraction':
            return buildSubtractionTask(profile);
          case 'multiplication':
            return buildMultiplicationTask(profile);
          case 'division':
            return buildDivisionTask(profile);
          default:
            return buildAdditionTask(profile);
        }
      }
    }),
    {
      name: 'math-trainer-v2',
      partialize: (state) => ({
        settings: state.settings,
        lastSession: state.lastSession
      })
    }
  )
);
