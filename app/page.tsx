"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";
import { HomeScreen } from "@/components/HomeScreen";
import { GameScreen } from "@/components/GameScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { AuthButton } from "@/components/AuthButton";
import { AuthModal } from "@/components/AuthModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ProfileScreen } from "@/components/ProfileScreen";
import { AchievementToast } from "@/components/AchievementToast";
import { TranslationProvider } from "@/lib/translations";
import { saveSession } from "@/lib/session";
import { useStatsStore } from "@/stores/statsStore";
import { createClient } from "@/lib/supabase/client";
import type { GameMode, Difficulty } from "@/types";

type Screen = "home" | "game" | "result" | "profile";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [prevScreen, setPrevScreen] = useState<Screen>("home");
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

  // Background prefetch of account data on auth changes
  useEffect(() => {
    const supabase = createClient();

    useStatsStore.getState().loadAll();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const store = useStatsStore.getState();
      if (event === "SIGNED_OUT" || !session?.user) {
        store.reset();
      } else if (event === "SIGNED_IN") {
        store.loadAll(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle screen transitions
  useEffect(() => {
    if (currentScreen === "profile") return;
    if (activeRound) {
      setCurrentScreen("game");
    } else if (lastSession && currentScreen === "game") {
      setCurrentScreen("result");
    }
  }, [activeRound, lastSession, currentScreen]);

  const openProfile = () => {
    setPrevScreen(currentScreen === "profile" ? "home" : currentScreen);
    setCurrentScreen("profile");
  };

  const closeProfile = () => {
    setCurrentScreen(prevScreen);
  };

  const handleLoggedOut = () => {
    setCurrentScreen("home");
  };

  const persistSession = (session: Parameters<typeof saveSession>[0]) => {
    saveSession(session)
      .then((res) => {
        if (res.success) {
          useStatsStore.getState().loadAll(true);
        }
      })
      .catch(console.error);
  };

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
              persistSession(round);
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
        persistSession(round);
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
    <TranslationProvider>
      <header className="site-header">
        <LanguageSelector />
        <AuthButton
          onLoginClick={() => setAuthModalOpen(true)}
          onProfileClick={openProfile}
          active={currentScreen === "profile"}
        />
      </header>

      <main className="app">
        {currentScreen === "profile" && (
          <ProfileScreen onClose={closeProfile} onLoggedOut={handleLoggedOut} />
        )}

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
                  persistSession(session);
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
      <AchievementToast />
    </TranslationProvider>
  );
}
