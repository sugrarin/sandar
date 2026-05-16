"use client";

import { Lock } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useStatsStore } from "@/stores/statsStore";

export function Achievements() {
  const userStats = useStatsStore((s) => s.userStats);
  const modeStats = useStatsStore((s) => s.modeStats);
  const ctx = { userStats, modeStats };

  const items = ACHIEVEMENTS.map((a) => {
    const p = a.progress(ctx);
    const unlocked = p.current >= p.goal;
    return { achievement: a, progress: p, unlocked };
  }).sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    const ap = a.progress.current / a.progress.goal;
    const bp = b.progress.current / b.progress.goal;
    return bp - ap;
  });

  const unlockedCount = items.filter((i) => i.unlocked).length;

  return (
    <div className="achv-wrapper">
      <div className="achv-summary">
        <span className="achv-summary__label">открыто</span>
        <span className="achv-summary__value">
          {unlockedCount}
          <span className="achv-summary__total"> / {items.length}</span>
        </span>
      </div>
      <ul className="achv-grid">
        {items.map(({ achievement, progress, unlocked }) => {
          const Icon = achievement.icon;
          const ratio = Math.min(1, progress.current / progress.goal);
          const showProgress = !unlocked && progress.goal > 1;
          return (
            <li
              key={achievement.code}
              className={`achv${unlocked ? " achv--unlocked" : ""}`}
            >
              <span className="achv__icon" aria-hidden="true">
                {unlocked ? <Icon /> : <Lock />}
              </span>
              <div className="achv__body">
                <p className="achv__title">{achievement.title}</p>
                <p className="achv__desc">{achievement.description}</p>
                {showProgress && (
                  <div className="achv__progress">
                    <div className="achv__progress-track">
                      <div
                        className="achv__progress-bar"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                    <span className="achv__progress-text">
                      {progress.current}/{progress.goal}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
