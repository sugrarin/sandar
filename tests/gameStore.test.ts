import { describe, expect, it } from "vitest";
import { createOptions, useGameStore } from "@/stores/gameStore";
import type { Difficulty, GameMode, Task } from "@/types";

const ARITHMETIC_MODES: GameMode[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "brain"];

function expectValidOptions(task: Task) {
  expect(task.options).toHaveLength(4);
  expect(new Set(task.options).size).toBe(4);
  expect(task.options).toContain(task.answer);
  expect(task.options.every((option) => option >= 0)).toBe(true);
}

function expectCorrectArithmetic(task: Task) {
  switch (task.operation) {
    case "addition":
      expect(task.answer).toBe(task.left + task.right);
      break;
    case "subtraction":
      expect(task.answer).toBe(task.left - task.right);
      expect(task.answer).toBeGreaterThanOrEqual(0);
      break;
    case "multiplication":
      expect(task.answer).toBe(task.left * task.right);
      break;
    case "division":
      expect(task.answer).toBe(task.left / task.right);
      expect(Number.isInteger(task.answer)).toBe(true);
      break;
  }
}

describe("createOptions", () => {
  it.each([0, 1, 9, 10, 11, 99, 9999])(
    "returns four unique options for %i",
    (answer) => {
      const options = createOptions(answer);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(answer);
      expect(options.every((option) => option >= 0)).toBe(true);
    },
  );
});

describe("task generation", () => {
  it.each(DIFFICULTIES)(
    "generates valid arithmetic at %s difficulty",
    (difficulty) => {
      for (const mode of ARITHMETIC_MODES) {
        for (let i = 0; i < 100; i++) {
          const task = useGameStore.getState().generateTask(mode, difficulty);
          expect(task.operation).toBe(mode);
          expectCorrectArithmetic(task);
          expectValidOptions(task);
        }
      }
    },
  );

  it("limits mixed mode to the four basic operations", () => {
    for (let i = 0; i < 200; i++) {
      const task = useGameStore.getState().generateTask("mixed", "medium");
      expect(ARITHMETIC_MODES).toContain(task.operation);
      expectCorrectArithmetic(task);
      expectValidOptions(task);
    }
  });

  it("generates the multiplication table from 1 to 10", () => {
    for (let i = 0; i < 100; i++) {
      const task = useGameStore.getState().generateTask("table", "brain");
      expect(task.operation).toBe("multiplication");
      expect(task.left).toBeGreaterThanOrEqual(1);
      expect(task.left).toBeLessThanOrEqual(10);
      expect(task.right).toBeGreaterThanOrEqual(1);
      expect(task.right).toBeLessThanOrEqual(10);
      expectCorrectArithmetic(task);
      expectValidOptions(task);
    }
  });
});
