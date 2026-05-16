"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";
import { HomeScreen } from "@/components/HomeScreen";
import { GameScreen } from "@/components/GameScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { AuthButton } from "@/components/AuthButton";
import { AuthModal } from "@/components/AuthModal";
import { saveSession } from "@/lib/session";
import type { GameMode, Difficulty } from "@/types";

type Screen = "home" | "game" | "result";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const {
    settings,
    activeRound,
    lastSession,
    setDifficulty,
    startRound,
    startReviewRound,
    replayCurrentMode,
    handleAnswer,
    advanceRound,
    finishCurrentRound,
    returnHome,
    getCurrentTask,
  } = useGameStore();

  // Handle screen transitions
  useEffect(() => {
    if (activeRound) {
      setCurrentScreen("game");
    } else if (lastSession && currentScreen === "game") {
      setCurrentScreen("result");
    }
  }, [activeRound, lastSession, currentScreen]);

  const onSelectDifficulty = (difficulty: Difficulty) => {
    setDifficulty(difficulty);
  };

  const onStartGame = (mode: GameMode) => {
    startRound(mode);
  };

  const onAnswer = (selected: number) => {
    const result = handleAnswer(selected);

    if (result.shouldAdvance) {
      setTimeout(
        () => {
          const advanceResult = advanceRound();
          if (advanceResult.type === "finished") {
            // Save session to backend if user is logged in
            const round = useGameStore.getState().lastSession;
            if (round) {
              saveSession(round).catch(console.error);
            }
          }
        },
        result.isCorrect ? 200 : 0,
      );
    }
  };

  const onFinishGame = () => {
    const result = finishCurrentRound();
    if (result) {
      const round = useGameStore.getState().lastSession;
      if (round) {
        saveSession(round).catch(console.error);
      }
    }
  };

  const onReturnHome = () => {
    returnHome();
    setCurrentScreen("home");
  };

  const onReviewMistakes = () => {
    startReviewRound();
  };

  const onReplay = () => {
    replayCurrentMode();
  };

  const currentTask = getCurrentTask();
  const round = activeRound;

  return (
    <>
      <header className="site-header">
        <AuthButton onClick={() => setAuthModalOpen(true)} />
      </header>

      <main className="app">
        {currentScreen === "home" && (
          <HomeScreen
            difficulty={settings.difficulty}
            onSelectDifficulty={onSelectDifficulty}
            onStartGame={onStartGame}
          />
        )}

        {currentScreen === "game" && round && currentTask && (
          <GameScreen
            mode={round.mode}
            difficulty={round.difficulty}
            currentIndex={round.mode === "review" ? round.score : round.index}
            total={round.total}
            score={round.score}
            task={currentTask}
            allowAdvance={round.allowAdvance}
            lastAnswer={round.lastAnswer}
            onAnswer={onAnswer}
            onAdvance={() => {
              const result = advanceRound();
              if (result && result.type === "finished") {
                const session = useGameStore.getState().lastSession;
                if (session) {
                  saveSession(session).catch(console.error);
                }
              }
            }}
            onFinish={onFinishGame}
          />
        )}

        {currentScreen === "result" && lastSession && (
          <ResultScreen
            score={lastSession.score}
            total={lastSession.total}
            hasMistakes={lastSession.mistakes.length > 0}
            onReview={onReviewMistakes}
            onReplay={onReplay}
            onReturnHome={onReturnHome}
            onStartGame={onStartGame}
          />
        )}
      </main>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}
