import { z } from "zod";

import type { MetricSpec, ScoreInput } from "@/domain/entities";

import { BaseChallengeStrategy } from "./_base";

const READING_METRICS = ["pages_read", "books_finished", "minutes_read"] as const;
export type ReadingMetricKey = (typeof READING_METRICS)[number];

/**
 * Reading challenge type. The whole point of having this file in v1 is to
 * prove the Factory + Strategy contract from ADR-006:
 *
 *   - one new file (this one)
 *   - one new line in src/server/composition.ts
 *   - one new row in public.challenge_types (seed migration 0007)
 *
 * No other code in the codebase changes. The type picker on
 * /challenges/new picks it up automatically because it iterates
 * `ChallengeTypeFactory.list()`. The create form picks up
 * `readingStrategy.challengeSchema` for validation; the stat-entry form
 * picks up `readingStrategy.statSchema`. Score + winner come from this
 * file's computeScore + the inherited BaseChallengeStrategy.decideWinner.
 */
export class ReadingStrategy extends BaseChallengeStrategy {
  readonly key = "reading";
  readonly label = "Reading";
  readonly icon = "book-open";
  readonly metrics: MetricSpec[] = [
    {
      metric: "pages_read",
      unit: "pages",
      direction: "higher",
      label: "Pages read",
    },
    {
      metric: "books_finished",
      unit: "books",
      direction: "higher",
      label: "Books finished",
    },
    {
      metric: "minutes_read",
      unit: "min",
      direction: "higher",
      label: "Minutes",
    },
  ];

  readonly challengeSchema = z
    .object({
      title: z.string().min(1).max(120),
      description: z.string().max(2000).optional(),
      goalMetric: z.enum(READING_METRICS),
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
    metric: z.enum(READING_METRICS),
    value: z.number().positive(),
    note: z.string().max(280).optional(),
  });

  /**
   * Reading is cumulative ("how many pages have I read total?") so we sum
   * every entry of the goal metric rather than using the latest reading
   * (which is how the weight-loss FitnessStrategy works). Progress = total /
   * target, clamped to [0, 1].
   */
  computeScore({ entries, goal }: ScoreInput): number {
    if (goal.target <= 0) return 0;
    const total = entries
      .filter((e) => e.metric === goal.metric)
      .reduce((acc, e) => acc + e.value, 0);
    return Math.max(0, Math.min(1, total / goal.target));
  }
}
