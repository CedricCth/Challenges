"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Participant, Profile } from "@/domain/entities";

interface ChartPoint {
  /** Local day key, e.g. "2026-05-10". Used as X-axis tick. */
  day: string;
  [participantId: string]: number | string | null;
}

interface SeriesMeta {
  profileId: string;
  displayName: string;
  color: string;
}

/**
 * Multi-participant line chart for the headline goal metric. Per ADR-017,
 * we group entries by the viewer's local day (so a 23:00 weigh-in in CH
 * and a 17:00 weigh-in the same day in US show as the same point).
 *
 * Per-day average is used when a participant logs multiple times in one day.
 */
export function StatsChart({
  goalMetric,
  unit,
  participants,
  profilesById,
  defaultColors,
}: {
  goalMetric: string;
  unit: string;
  participants: Participant[];
  profilesById: Record<string, Profile>;
  defaultColors: Record<string, string>;
}) {
  const { data, series } = useMemo(
    () => buildSeries(participants, goalMetric, profilesById, defaultColors),
    [participants, goalMetric, profilesById, defaultColors],
  );

  if (data.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No entries yet. Add the first one to see the chart.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11 }}
            tickFormatter={formatDayTick}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            domain={["auto", "auto"]}
            allowDecimals
          />
          <Tooltip
            formatter={(v) =>
              typeof v === "number" ? `${v.toFixed(2)} ${unit}` : String(v)
            }
            labelFormatter={(v) =>
              typeof v === "string" ? formatDayLabel(v) : String(v)
            }
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          {series.map((s) => (
            <Line
              key={s.profileId}
              type="monotone"
              dataKey={s.profileId}
              name={s.displayName}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        {series.map((s) => (
          <div key={s.profileId} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span>{s.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FALLBACK_COLORS = ["#2563EB", "#C084FC", "#10B981", "#F59E0B"];

function buildSeries(
  participants: Participant[],
  goalMetric: string,
  profilesById: Record<string, Profile>,
  defaultColors: Record<string, string>,
): { data: ChartPoint[]; series: SeriesMeta[] } {
  // Collect (day, participant, value) tuples, averaging duplicates per day.
  const perDay = new Map<string, Map<string, { sum: number; n: number }>>();
  const series: SeriesMeta[] = [];

  participants.forEach((p, idx) => {
    const profile = profilesById[p.profileId];
    series.push({
      profileId: p.profileId,
      displayName: profile?.displayName ?? p.profileId.slice(0, 6),
      color:
        profile?.color ??
        defaultColors[p.profileId] ??
        FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    });

    for (const entry of p.entries) {
      if (entry.metric !== goalMetric) continue;
      const day = toLocalDayKey(entry.recordedAt);
      let dayBucket = perDay.get(day);
      if (!dayBucket) {
        dayBucket = new Map();
        perDay.set(day, dayBucket);
      }
      const cur = dayBucket.get(p.profileId) ?? { sum: 0, n: 0 };
      cur.sum += entry.value;
      cur.n += 1;
      dayBucket.set(p.profileId, cur);
    }
  });

  const days = [...perDay.keys()].sort();
  const data: ChartPoint[] = days.map((day) => {
    const bucket = perDay.get(day)!;
    const point: ChartPoint = { day };
    for (const s of series) {
      const v = bucket.get(s.profileId);
      point[s.profileId] = v ? v.sum / v.n : null;
    }
    return point;
  });

  return { data, series };
}

/** "2026-05-10" in viewer-local time. */
function toLocalDayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const tickFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function formatDayTick(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return tickFormatter.format(new Date(y, m - 1, d));
}

const labelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function formatDayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return labelFormatter.format(new Date(y, m - 1, d));
}
