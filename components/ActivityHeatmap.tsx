"use client";

import type { ActivityData } from "@/stores/statsStore";

interface ActivityHeatmapProps {
  data: ActivityData | null;
  loading: boolean;
}

const WEEKDAYS = ["Пн", "Ср", "Пт"];
const MONTH_LABELS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function startOfDayUTC(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function level(sessions: number): number {
  if (sessions <= 0) return 0;
  if (sessions === 1) return 1;
  if (sessions <= 3) return 2;
  if (sessions <= 6) return 3;
  return 4;
}

export function ActivityHeatmap({ data, loading }: ActivityHeatmapProps) {
  const weeksCount = data?.weeks ?? 26;

  const today = startOfDayUTC(new Date());
  // Align grid end to the most recent Sunday >= today
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday
  const gridEnd = new Date(today);
  gridEnd.setUTCDate(today.getUTCDate() + (6 - dayOfWeek));
  const gridStart = new Date(gridEnd);
  gridStart.setUTCDate(gridEnd.getUTCDate() - weeksCount * 7 + 1);

  const map = new Map<string, { sessions: number; questions: number; correct: number }>();
  if (data) {
    for (const d of data.days) {
      map.set(d.date, {
        sessions: d.sessions,
        questions: d.questions,
        correct: d.correct,
      });
    }
  }

  const weeks: { date: Date; key: string; level: number; tooltip: string; isFuture: boolean }[][] =
    [];

  for (let w = 0; w < weeksCount; w++) {
    const week: typeof weeks[number] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + w * 7 + day);
      const key = isoDate(date);
      const cell = map.get(key);
      const sessions = cell?.sessions ?? 0;
      const isFuture = date > today;
      const accuracy =
        cell && cell.questions > 0
          ? `${Math.round((cell.correct / cell.questions) * 100)}%`
          : null;
      const tooltip = isFuture
        ? ""
        : sessions === 0
          ? `${key} — без активности`
          : `${key} — ${sessions} тренир., ${cell?.questions ?? 0} вопросов${
              accuracy ? `, ${accuracy} точности` : ""
            }`;
      week.push({
        date,
        key,
        level: isFuture ? 0 : level(sessions),
        tooltip,
        isFuture,
      });
    }
    weeks.push(week);
  }

  // Month labels: show label above first week where the first day's month differs from previous
  const monthLabels: { col: number; label: string }[] = [];
  let prevMonth = -1;
  weeks.forEach((week, idx) => {
    const firstDay = week[0]?.date;
    if (!firstDay) return;
    const m = firstDay.getUTCMonth();
    if (m !== prevMonth) {
      monthLabels.push({ col: idx, label: MONTH_LABELS[m] });
      prevMonth = m;
    }
  });

  return (
    <div className="heatmap" aria-label="Активность за полгода">
      <div
        className="heatmap__months"
        style={{ gridTemplateColumns: `repeat(${weeksCount}, 1fr)` }}
      >
        {monthLabels.map((m) => (
          <span
            key={`${m.col}-${m.label}`}
            className="heatmap__month"
            style={{ gridColumnStart: m.col + 1 }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div className="heatmap__body">
        <div className="heatmap__weekdays" aria-hidden="true">
          <span className="heatmap__weekday" style={{ gridRow: 2 }}>
            {WEEKDAYS[0]}
          </span>
          <span className="heatmap__weekday" style={{ gridRow: 4 }}>
            {WEEKDAYS[1]}
          </span>
          <span className="heatmap__weekday" style={{ gridRow: 6 }}>
            {WEEKDAYS[2]}
          </span>
        </div>
        <div
          className={`heatmap__grid${loading && !data ? " heatmap__grid--loading" : ""}`}
          style={{ gridTemplateColumns: `repeat(${weeksCount}, 1fr)` }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap__week">
              {week.map((cell) => (
                <span
                  key={cell.key}
                  className={`heatmap__cell heatmap__cell--l${cell.level}${
                    cell.isFuture ? " heatmap__cell--future" : ""
                  }`}
                  title={cell.tooltip}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap__legend">
        <span>меньше</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heatmap__cell heatmap__cell--l${l}`} />
        ))}
        <span>больше</span>
      </div>
    </div>
  );
}
