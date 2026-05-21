"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";
import { HomeScreen } from "@/components/HomeScreen";
import { GameScreen } from "@/components/GameScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { AuthModal } from "@/components/AuthModal";
import { ProfileScreen } from "@/components/ProfileScreen";
import { ProfileEditScreen } from "@/components/ProfileEditScreen";
import { SharedAccess } from "@/components/SharedAccess";
import { AccountLayout } from "@/components/AccountLayout";
import { StudentStatsView } from "@/components/StudentStatsView";
import { AchievementToast } from "@/components/AchievementToast";
import { Navbar } from "@/components/Navbar";
import { TranslationProvider } from "@/lib/translations";
import { saveSession } from "@/lib/session";
import { useStatsStore } from "@/stores/statsStore";
import { createClient } from "@/lib/supabase/client";
import {
  NavigationProvider,
  useNavigation,
} from "@/contexts/NavigationContext";
import type { GameMode, Difficulty } from "@/types";

function AppContent() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { stack, push, replace, reset } = useNavigation();
  const currentRoute = stack[stack.length - 1];

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

  // Clean up game state when navigating away from game/result via Navbar
  useEffect(() => {
    if (currentRoute?.name === "home" && activeRound) {
      returnHome();
    }
  }, [currentRoute, activeRound, returnHome]);

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
    if (currentRoute?.name === "result") {
      replace({ name: "game" });
    } else {
      push({ name: "game" });
    }
  };

  const onAnswer = (selected: number) => {
    const result = handleAnswer(selected);

    if (result.shouldAdvance) {
      setTimeout(
        () => {
          const advanceResult = advanceRound();
          if (advanceResult.type === "finished") {
            replace({ name: "result" });
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
      replace({ name: "result" });
      const round = useGameStore.getState().lastSession;
      if (round) {
        persistSession(round);
      }
    }
  };

  const onReturnHome = () => {
    returnHome();
    reset();
  };

  const onReviewMistakes = () => {
    startReviewRound();
    replace({ name: "game" });
  };

  const onReplay = () => {
    replayCurrentMode();
    replace({ name: "game" });
  };

  const currentTask = getCurrentTask();
  const round = activeRound;

  return (
    <>
      <Navbar onLoginClick={() => setAuthModalOpen(true)} />

      <main className="app">
        {currentRoute?.name === "home" && (
          <HomeScreen
            difficulty={settings.difficulty}
            onSelectDifficulty={onSelectDifficulty}
            onStartGame={onStartGame}
          />
        )}

        {(currentRoute?.name === "account-profile" ||
          currentRoute?.name === "account-share") && (
          <AccountLayout>
            {currentRoute.name === "account-profile" ? (
              <ProfileScreen />
            ) : (
              <SharedAccess />
            )}
          </AccountLayout>
        )}

        {currentRoute?.name === "profileEdit" && <ProfileEditScreen />}

        {currentRoute?.name === "studentStats" && (
          <StudentStatsView
            studentId={currentRoute.params?.studentId as string}
            activatedAt={currentRoute.params?.activatedAt as string | undefined}
          />
        )}

        {currentRoute?.name === "game" && round && currentTask && (
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
                replace({ name: "result" });
                const session = useGameStore.getState().lastSession;
                if (session) {
                  persistSession(session);
                }
              }
            }}
            onFinish={onFinishGame}
          />
        )}

        {currentRoute?.name === "result" && lastSession && (
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
    </>
  );
}

export default function Home() {
  return (
    <NavigationProvider>
      <TranslationProvider>
        <AppContent />
      </TranslationProvider>
    </NavigationProvider>
  );
}
