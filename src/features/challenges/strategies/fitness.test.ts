import { describe, expect, it } from "vitest";

import type { ScoreInput, StatEntry } from "@/domain/entities";

import { FitnessStrategy } from "./fitness";

function entry(partial: Partial<StatEntry> & Pick<StatEntry, "metric" | "value">): StatEntry {
  return {
    id: crypto.randomUUID(),
    challengeId: "c1",
    profileId: "p1",
    unit: "kg",
    recordedAt: new Date(),
    note: null,
    photoUrl: null,
    ...partial,
  };
}

const baseGoal = {
  metric: "weight_kg",
  target: 5,
  direction: "lower" as const,
};

describe("FitnessStrategy.computeScore", () => {
  const fitness = new FitnessStrategy();

  it("returns 0 when no entries exist for the goal metric", () => {
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: 80,
      entries: [],
      goal: baseGoal,
    };
    expect(fitness.computeScore(input)).toBe(0);
  });

  it("returns 0.5 for half the target progress on a 'lower' goal", () => {
    // baseline 80, latest 77.5 → 2.5kg lost out of 5kg target = 0.5
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: 80,
      entries: [entry({ metric: "weight_kg", value: 77.5 })],
      goal: baseGoal,
    };
    expect(fitness.computeScore(input)).toBeCloseTo(0.5);
  });

  it("clamps to 1 when the goal is exceeded ('lower')", () => {
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: 80,
      entries: [entry({ metric: "weight_kg", value: 70 })],
      goal: baseGoal,
    };
    expect(fitness.computeScore(input)).toBe(1);
  });

  it("clamps to 0 when progress is negative ('lower' goal but weight went up)", () => {
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: 80,
      entries: [entry({ metric: "weight_kg", value: 82 })],
      goal: baseGoal,
    };
    expect(fitness.computeScore(input)).toBe(0);
  });

  it("handles a 'higher' goal (workouts) symmetrically", () => {
    // baseline 0, latest 15, target 30 → 0.5
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: 0,
      entries: [entry({ metric: "workouts", value: 15, unit: "count" })],
      goal: { metric: "workouts", target: 30, direction: "higher" },
    };
    expect(fitness.computeScore(input)).toBeCloseTo(0.5);
  });

  it("uses the latest matching entry, ignoring older ones and other metrics", () => {
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: 80,
      entries: [
        entry({ metric: "weight_kg", value: 79 }),
        entry({ metric: "body_fat_pct", value: 22, unit: "%" }),
        entry({ metric: "weight_kg", value: 77.5 }),
      ],
      goal: baseGoal,
    };
    expect(fitness.computeScore(input)).toBeCloseTo(0.5);
  });

  it("falls back to the first matching entry when no startingValue is set", () => {
    // No baseline → first weight_kg entry (80) is used as baseline.
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: null,
      entries: [
        entry({ metric: "weight_kg", value: 80 }),
        entry({ metric: "weight_kg", value: 77.5 }),
      ],
      goal: baseGoal,
    };
    expect(fitness.computeScore(input)).toBeCloseTo(0.5);
  });
});

describe("FitnessStrategy.decideWinner (inherited from BaseChallengeStrategy)", () => {
  const fitness = new FitnessStrategy();

  it("picks the higher-scoring participant", () => {
    const result = fitness.decideWinner({
      participants: [
        {
          profileId: "cedi",
          startingValue: 80,
          entries: [entry({ metric: "weight_kg", value: 78 })],
          goal: baseGoal,
        },
        {
          profileId: "stefi",
          startingValue: 65,
          entries: [entry({ metric: "weight_kg", value: 64 })],
          goal: { metric: "weight_kg", target: 5, direction: "lower" },
        },
      ],
    });
    // Cedi lost 2kg → 0.4. Stefi lost 1kg → 0.2. Cedi wins.
    expect(result).toEqual({ tie: false, winnerId: "cedi" });
  });

  it("calls a tie when both participants have identical top scores", () => {
    const result = fitness.decideWinner({
      participants: [
        {
          profileId: "cedi",
          startingValue: 80,
          entries: [entry({ metric: "weight_kg", value: 77.5 })],
          goal: baseGoal,
        },
        {
          profileId: "stefi",
          startingValue: 65,
          entries: [entry({ metric: "weight_kg", value: 62.5 })],
          goal: baseGoal,
        },
      ],
    });
    expect(result).toEqual({ tie: true });
  });

  it("handles an empty participant list with a tie", () => {
    expect(fitness.decideWinner({ participants: [] })).toEqual({ tie: true });
  });
});

describe("FitnessStrategy schemas", () => {
  const fitness = new FitnessStrategy();

  it("statSchema rejects non-fitness metrics", () => {
    const result = fitness.statSchema.safeParse({
      metric: "pages_read",
      value: 10,
    });
    expect(result.success).toBe(false);
  });

  it("statSchema accepts a valid weight reading", () => {
    const result = fitness.statSchema.safeParse({
      metric: "weight_kg",
      value: 79.4,
    });
    expect(result.success).toBe(true);
  });

  it("challengeSchema rejects endDate before startDate", () => {
    const result = fitness.challengeSchema.safeParse({
      title: "Spring fitness",
      goalMetric: "weight_kg",
      goalTarget: 5,
      goalDirection: "lower",
      startDate: "2026-05-01",
      endDate: "2026-04-30",
    });
    expect(result.success).toBe(false);
  });
});
