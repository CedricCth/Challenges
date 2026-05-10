import { z } from "zod";

import type { MetricSpec, ScoreInput } from "@/domain/entities";

import { lastValueOf } from "../strategy";
import { BaseChallengeStrategy } from "./_base";

const FITNESS_METRICS = [
  "weight_kg",
  "body_fat_pct",
  "workouts",
  "steps",
] as const;
export type FitnessMetricKey = (typeof FITNESS_METRICS)[number];

export class FitnessStrategy extends BaseChallengeStrategy {
  readonly key = "fitness";
  readonly label = "Fitness";
  readonly icon = "dumbbell";
  readonly metrics: MetricSpec[] = [
    {
      metric: "weight_kg",
      unit: "kg",
      direction: "lower",
      label: "Weight",
    },
    {
      metric: "body_fat_pct",
      unit: "%",
      direction: "lower",
      label: "Body fat",
    },
    {
      metric: "workouts",
      unit: "count",
      direction: "higher",
      label: "Workouts",
    },
    {
      metric: "steps",
      unit: "steps",
      direction: "higher",
      label: "Steps",
    },
  ];

  readonly challengeSchema = z
    .object({
      title: z.string().min(1).max(120),
      description: z.string().max(2000).optional(),
      goalMetric: z.enum(FITNESS_METRICS),
      goalTarget: z.number().positive(),
      goalDirection: z.enum(["higher", "lower"]),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    })
    .refine((d) => d.endDate >= d.startDate, {
      message: "End date must be on or after start date",
      path: ["endDate"],
    });

  readonly statSchema = z.object({
    metric: z.enum(FITNESS_METRICS),
    value: z.number().positive(),
    note: z.string().max(280).optional(),
  });

  /**
   * Progress toward the headline goal, clamped to [0, 1].
   *
   * For a "lower" goal (e.g. weight loss): score = (baseline - latest) / target.
   * For a "higher" goal (e.g. workouts done): score = (latest - baseline) / target.
   * Negative progress is clipped to 0; over-achievement caps at 1.
   *
   * If we don't have a starting value or any entries for the goal metric yet,
   * we return 0 — the participant hasn't started moving.
   */
  computeScore({ startingValue, entries, goal }: ScoreInput): number {
    const latest = lastValueOf(entries, goal.metric);
    if (latest == null) return 0;

    const baseline =
      startingValue ??
      // Fall back to the first recorded value of the goal metric if we don't
      // have an explicit baseline. Avoids returning 0 forever.
      entries.find((e) => e.metric === goal.metric)?.value ??
      null;

    if (baseline == null || goal.target <= 0) return 0;

    const delta = goal.direction === "lower" ? baseline - latest : latest - baseline;
    return Math.max(0, Math.min(1, delta / goal.target));
  }
}
