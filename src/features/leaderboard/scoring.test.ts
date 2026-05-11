import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  ChallengeWithParticipants,
  Profile,
  StatEntry,
} from "@/domain/entities";
import { ChallengeTypeFactory } from "@/features/challenges/factory";
import { FitnessStrategy } from "@/features/challenges/strategies/fitness";

import { computeLeaderboard } from "./scoring";

const cedi: Profile = {
  id: "cedi",
  displayName: "Cedi",
  color: "#2563EB",
  avatarUrl: null,
  bio: null,
};
const stefi: Profile = {
  id: "stefi",
  displayName: "Stefi",
  color: "#C084FC",
  avatarUrl: null,
  bio: null,
};

function entry(
  profileId: string,
  challengeId: string,
  value: number,
  recordedAt: Date,
  metric = "weight_kg",
): StatEntry {
  return {
    id: crypto.randomUUID(),
    challengeId,
    profileId,
    metric,
    value,
    unit: "kg",
    recordedAt,
    note: null,
    photoUrl: null,
  };
}

function fitnessChallenge(
  id: string,
  args: {
    winnerId: string | null;
    tie?: boolean;
    startDate: string;
    endDate: string;
    cediEntries?: { value: number; on: Date }[];
    stefiEntries?: { value: number; on: Date }[];
    cediStart?: number;
    stefiStart?: number;
    status?: "completed" | "active" | "cancelled";
  },
): ChallengeWithParticipants {
  return {
    id,
    title: id,
    description: null,
    typeKey: "fitness",
    goalMetric: "weight_kg",
    goalTarget: 5,
    goalDirection: "lower",
    status: args.status ?? "completed",
    startDate: args.startDate,
    endDate: args.endDate,
    winnerId: args.winnerId,
    tie: args.tie ?? false,
    coverImageUrl: null,
    metadata: {},
    createdBy: "cedi",
    createdAt: new Date(args.startDate),
    updatedAt: new Date(args.endDate),
    participants: [
      {
        profileId: "cedi",
        startingValue: args.cediStart ?? 80,
        entries: (args.cediEntries ?? []).map((e) =>
          entry("cedi", id, e.value, e.on),
        ),
      },
      {
        profileId: "stefi",
        startingValue: args.stefiStart ?? 65,
        entries: (args.stefiEntries ?? []).map((e) =>
          entry("stefi", id, e.value, e.on),
        ),
      },
    ],
  };
}

beforeEach(() => {
  ChallengeTypeFactory.reset();
  ChallengeTypeFactory.register(new FitnessStrategy());
});
afterEach(() => {
  ChallengeTypeFactory.reset();
});

describe("computeLeaderboard — basic counts", () => {
  it("returns zero everything when no completed challenges", () => {
    const result = computeLeaderboard(
      [
        fitnessChallenge("c1", {
          winnerId: null,
          status: "active",
          startDate: "2026-01-01",
          endDate: "2026-02-01",
        }),
      ],
      [cedi, stefi],
    );
    expect(result.completedCount).toBe(0);
    expect(result.entries.map((e) => e.totalWins)).toEqual([0, 0]);
  });

  it("counts total wins per profile, excludes ties", () => {
    const result = computeLeaderboard(
      [
        fitnessChallenge("c1", {
          winnerId: "cedi",
          startDate: "2026-01-01",
          endDate: "2026-02-01",
        }),
        fitnessChallenge("c2", {
          winnerId: "cedi",
          startDate: "2026-02-01",
          endDate: "2026-03-01",
        }),
        fitnessChallenge("c3", {
          winnerId: null,
          tie: true,
          startDate: "2026-03-01",
          endDate: "2026-04-01",
        }),
        fitnessChallenge("c4", {
          winnerId: "stefi",
          startDate: "2026-04-01",
          endDate: "2026-05-01",
        }),
      ],
      [cedi, stefi],
    );
    const byId = Object.fromEntries(result.entries.map((e) => [e.profile.id, e]));
    expect(byId.cedi.totalWins).toBe(2);
    expect(byId.stefi.totalWins).toBe(1);
    expect(result.tieCount).toBe(1);
  });

  it("win rate excludes ties and cancelled (denominator = completed participated in)", () => {
    const result = computeLeaderboard(
      [
        fitnessChallenge("c1", {
          winnerId: "cedi",
          startDate: "2026-01-01",
          endDate: "2026-02-01",
        }),
        fitnessChallenge("c2", {
          winnerId: "stefi",
          startDate: "2026-02-01",
          endDate: "2026-03-01",
        }),
      ],
      [cedi, stefi],
    );
    const byId = Object.fromEntries(result.entries.map((e) => [e.profile.id, e]));
    expect(byId.cedi.winRate).toBeCloseTo(0.5);
    expect(byId.stefi.winRate).toBeCloseTo(0.5);
  });
});

describe("computeLeaderboard — longest streak", () => {
  it("counts consecutive wins, breaking on tie", () => {
    const result = computeLeaderboard(
      [
        fitnessChallenge("c1", {
          winnerId: "cedi",
          startDate: "2026-01-01",
          endDate: "2026-02-01",
        }),
        fitnessChallenge("c2", {
          winnerId: "cedi",
          startDate: "2026-02-01",
          endDate: "2026-03-01",
        }),
        fitnessChallenge("c3", {
          winnerId: null,
          tie: true,
          startDate: "2026-03-01",
          endDate: "2026-04-01",
        }),
        fitnessChallenge("c4", {
          winnerId: "cedi",
          startDate: "2026-04-01",
          endDate: "2026-05-01",
        }),
      ],
      [cedi, stefi],
    );
    const byId = Object.fromEntries(result.entries.map((e) => [e.profile.id, e]));
    expect(byId.cedi.longestStreak).toBe(2);
    expect(byId.cedi.onCurrentStreak).toBe(true);
    expect(byId.stefi.longestStreak).toBe(0);
  });
});

describe("computeLeaderboard — biggest comeback", () => {
  it("finds a challenge where the eventual winner was behind at midpoint", () => {
    // Window: Jan 1 → Mar 1 (midpoint ~Feb 1).
    // Cedi: starts 80, by Jan 20 only at 79.5 (lost 0.5 of 5 = 0.1). Then crushes it by Mar 1.
    // Stefi: starts 65, by Jan 20 at 63 (lost 2 of 5 = 0.4). Leads at midpoint.
    // But Cedi ends up winning. -> comeback for Cedi, deficit 0.3.
    const challenge = fitnessChallenge("c1", {
      winnerId: "cedi",
      startDate: "2026-01-01",
      endDate: "2026-03-01",
      cediStart: 80,
      stefiStart: 65,
      cediEntries: [
        { value: 79.5, on: new Date("2026-01-20") },
        { value: 75, on: new Date("2026-02-25") }, // big finish
      ],
      stefiEntries: [
        { value: 63, on: new Date("2026-01-20") },
        { value: 63.5, on: new Date("2026-02-25") }, // backslide
      ],
    });
    const result = computeLeaderboard([challenge], [cedi, stefi]);
    expect(result.biggestComeback).not.toBeNull();
    expect(result.biggestComeback?.winner.id).toBe("cedi");
    expect(result.biggestComeback?.midpointDeficit).toBeGreaterThan(0);
  });

  it("returns null when nobody came back (winner led at midpoint)", () => {
    const challenge = fitnessChallenge("c1", {
      winnerId: "cedi",
      startDate: "2026-01-01",
      endDate: "2026-03-01",
      cediEntries: [{ value: 75, on: new Date("2026-01-20") }],
      stefiEntries: [{ value: 65, on: new Date("2026-01-20") }],
    });
    const result = computeLeaderboard([challenge], [cedi, stefi]);
    expect(result.biggestComeback).toBeNull();
  });
});
