import { describe, expect, it } from "vitest";

import type { ScoreInput, StatEntry } from "@/domain/entities";

import { ReadingStrategy } from "./reading";

function entry(
  partial: Partial<StatEntry> & Pick<StatEntry, "metric" | "value">,
): StatEntry {
  return {
    id: crypto.randomUUID(),
    challengeId: "c1",
    profileId: "p1",
    unit: "pages",
    recordedAt: new Date(),
    note: null,
    photoUrl: null,
    ...partial,
  };
}

const pagesGoal = {
  metric: "pages_read",
  target: 1000,
  direction: "higher" as const,
};

describe("ReadingStrategy.computeScore", () => {
  const reading = new ReadingStrategy();

  it("returns 0 when no entries match the goal metric", () => {
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: null,
      entries: [],
      goal: pagesGoal,
    };
    expect(reading.computeScore(input)).toBe(0);
  });

  it("sums every entry of the goal metric (cumulative)", () => {
    // 200 + 300 + 100 = 600 of 1000 = 0.6
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: null,
      entries: [
        entry({ metric: "pages_read", value: 200 }),
        entry({ metric: "pages_read", value: 300 }),
        entry({ metric: "pages_read", value: 100 }),
      ],
      goal: pagesGoal,
    };
    expect(reading.computeScore(input)).toBeCloseTo(0.6);
  });

  it("clamps to 1 when the goal is exceeded", () => {
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: null,
      entries: [entry({ metric: "pages_read", value: 2000 })],
      goal: pagesGoal,
    };
    expect(reading.computeScore(input)).toBe(1);
  });

  it("ignores entries from a different metric", () => {
    const input: ScoreInput = {
      profileId: "p1",
      startingValue: null,
      entries: [
        entry({ metric: "minutes_read", value: 9999, unit: "min" }),
        entry({ metric: "pages_read", value: 500 }),
      ],
      goal: pagesGoal,
    };
    expect(reading.computeScore(input)).toBeCloseTo(0.5);
  });
});

describe("ReadingStrategy schemas", () => {
  const reading = new ReadingStrategy();

  it("accepts a valid pages entry", () => {
    const result = reading.statSchema.safeParse({
      metric: "pages_read",
      value: 42,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown metric", () => {
    const result = reading.statSchema.safeParse({
      metric: "calories_burned",
      value: 100,
    });
    expect(result.success).toBe(false);
  });
});
