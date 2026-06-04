'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { HomeScreen } from '@/components/HomeScreen';
import { GameScreen } from '@/components/GameScreen';
import { ResultScreen } from '@/components/ResultScreen';
import { AuthButton } from '@/components/AuthButton';
import { AuthModal } from '@/components/AuthModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { saveSession } from '@/lib/session';
import type { GameMode, Difficulty } from '@/types';

type Screen = 'home' | 'game' | 'result';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    getCurrentTask
  } = useGameStore();

  useEffect(() => {
    if (activeRound) {
      setCurrentScreen('game');
    } else if (lastSession && currentScreen === 'game') {
      setCurrentScreen('result');
    }
  }, [activeRound, lastSession, currentScreen]);

  const doSaveSession = (duration: number) => {
    const session = useGameStore.getState().lastSession;
    const answers = useGameStore.getState().answers;
    if (!session) return;
    saveSession({
      mode: session.mode,
      difficulty: session.difficulty,
      totalQuestions: session.total,
      correctAnswers: session.score,
      wrongAnswers: session.total - session.score,
      durationSeconds: duration,
      answers
    }).then(result => {
      if (!result.success) setSaveError('Не удалось сохранить результат');
    }).catch(() => setSaveError('Не удалось сохранить результат'));
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
      setTimeout(() => {
        const advanceResult = advanceRound();
        if (advanceResult?.type === 'finished') {
          doSaveSession(advanceResult.duration);
        }
      }, result.isCorrect ? 200 : 0);
    }
  };

  const onAdvance = () => {
    const advanceResult = advanceRound();
    if (advanceResult?.type === 'finished') {
      doSaveSession(advanceResult.duration);
    }
  };

  const onFinishGame = () => {
    const result = finishCurrentRound();
    if (result) {
      doSaveSession(result.duration);
    }
  };

  const onReturnHome = () => {
    returnHome();
    setCurrentScreen('home');
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
    <ErrorBoundary>
      <AuthButton onClick={() => setAuthModalOpen(true)} />

      <main className="app">
        {currentScreen === 'home' && (
          <HomeScreen
            difficulty={settings.difficulty}
            onSelectDifficulty={onSelectDifficulty}
            onStartGame={onStartGame}
          />
        )}

        {currentScreen === 'game' && round && currentTask && (
          <GameScreen
            mode={round.mode}
            difficulty={round.difficulty}
            currentIndex={round.mode === 'review' ? round.score : round.index}
            total={round.total}
            score={round.score}
            task={currentTask}
            allowAdvance={round.allowAdvance}
            lastAnswer={round.lastAnswer}
            onAnswer={onAnswer}
            onAdvance={onAdvance}
            onFinish={onFinishGame}
          />
        )}

        {currentScreen === 'result' && lastSession && (
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

      {saveError && (
        <div className="save-error" role="alert" onClick={() => setSaveError(null)}>
          {saveError}
        </div>
      )}

      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}
    </ErrorBoundary>
  );
}
