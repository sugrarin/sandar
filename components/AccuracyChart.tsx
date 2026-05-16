"use client";

import type { ActivityData } from "@/stores/statsStore";

interface AccuracyChartProps {
  data: ActivityData | null;
  loading: boolean;
}

const WEEKS = 26;
const DAY_MS = 86_400_000;

export function AccuracyChart({ data, loading }: AccuracyChartProps) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dow = today.getUTCDay();
  const gridEnd = new Date(today);
  gridEnd.setUTCDate(today.getUTCDate() + (6 - dow));
  const gridStart = new Date(gridEnd);
  gridStart.setUTCDate(gridEnd.getUTCDate() - WEEKS * 7 + 1);

  const buckets = Array.from({ length: WEEKS }, () => ({
    correct: 0,
    questions: 0,
  }));

  if (data) {
    for (const d of data.days) {
      const date = new Date(d.date);
      date.setUTCHours(0, 0, 0, 0);
      const diff = Math.floor(
        (date.getTime() - gridStart.getTime()) / DAY_MS,
      );
      const idx = Math.floor(diff / 7);
      if (idx >= 0 && idx < WEEKS) {
        buckets[idx].correct += d.correct;
        buckets[idx].questions += d.questions;
      }
    }
  }

  const totalCorrect = buckets.reduce((a, b) => a + b.correct, 0);
  const totalQuestions = buckets.reduce((a, b) => a + b.questions, 0);
  const overall =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : null;

  return (
    <div className="acc-chart-wrapper">
      <div className="acc-chart-summary">
        <span className="acc-chart-summary__label">за полгода</span>
        <span className="acc-chart-summary__value">
          {overall !== null ? `${overall}%` : "—"}
        </span>
      </div>
      <div
        className={`acc-chart${loading && !data ? " acc-chart--loading" : ""}`}
        aria-label="Точность по неделям"
      >
        {buckets.map((b, i) => {
          const accuracy =
            b.questions > 0 ? b.correct / b.questions : null;
          const weekStart = new Date(gridStart);
          weekStart.setUTCDate(gridStart.getUTCDate() + i * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
          const tooltip =
            accuracy !== null
              ? `${weekStart.toISOString().slice(0, 10)} — ${weekEnd
                  .toISOString()
                  .slice(0, 10)}: ${Math.round(
                  accuracy * 100,
                )}% (${b.correct}/${b.questions})`
              : `${weekStart.toISOString().slice(0, 10)} — без активности`;

          return (
            <div key={i} className="acc-chart__col" title={tooltip}>
              {accuracy !== null && (
                <div
                  className="acc-chart__bar"
                  style={{
                    height: `${Math.max(3, accuracy * 100)}%`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
