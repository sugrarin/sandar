"use client";

import { Flame, Zap } from "lucide-react";
import { useStatsStore } from "@/stores/statsStore";

export function HeaderBadges() {
  const userStats = useStatsStore((s) => s.userStats);

  if (!userStats) return null;

  const streak = userStats.streak_days ?? 0;
  const xp = userStats.total_xp ?? 0;

  return (
    <div className="header-badges">
      <span className="header-badge header-badge--streak">
        <Flame aria-hidden="true" />
        <span>{streak}</span>
      </span>
      <span className="header-badge header-badge--xp">
        <Zap aria-hidden="true" />
        <span>{xp}</span>
      </span>
    </div>
  );
}
