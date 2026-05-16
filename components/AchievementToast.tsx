"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useStatsStore } from "@/stores/statsStore";
import { getAchievement } from "@/lib/achievements";

const AUTO_DISMISS_MS = 5000;

export function AchievementToast() {
  const queue = useStatsStore((s) => s.newAchievements);
  const dismiss = useStatsStore((s) => s.dismissAchievement);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => dismiss(current), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [current, dismiss]);

  if (!current) return null;
  const achievement = getAchievement(current);
  if (!achievement) return null;

  const Icon = achievement.icon;

  return (
    <div
      className="achv-toast"
      role="status"
      aria-live="polite"
      onClick={() => dismiss(current)}
    >
      <span className="achv-toast__icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="achv-toast__body">
        <p className="achv-toast__eyebrow">Новое достижение</p>
        <p className="achv-toast__title">{achievement.title}</p>
        <p className="achv-toast__desc">{achievement.description}</p>
      </div>
      <button
        type="button"
        className="achv-toast__close"
        onClick={(e) => {
          e.stopPropagation();
          dismiss(current);
        }}
        aria-label="Закрыть"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
