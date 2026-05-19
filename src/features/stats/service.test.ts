import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import type { StatEntry } from "@/domain/entities";
import type {
  AddStatInput,
  IStatsRepo,
  UpdateStatInput,
} from "@/domain/ports";
import { ChallengeTypeFactory } from "@/features/challenges/factory";
import { FitnessStrategy } from "@/features/challenges/strategies/fitness";

import { makeStatsService } from "./service";

/**
 * In-memory IStatsRepo. We capture the last call so each test can assert
 * the exact payload the service forwarded — the DI seam in action.
 */
function makeFakeRepo() {
  const calls: {
    add: AddStatInput[];
    update: UpdateStatInput[];
    findOwned: Array<{ id: string; ownerProfileId: string }>;
    listForChallenge: string[];
  } = { add: [], update: [], findOwned: [], listForChallenge: [] };
  let updateResult: StatEntry | null = null;

  const repo: IStatsRepo = {
    async add(input) {
      calls.add.push(input);
      return makeFakeEntry({ ...input });
    },
    async update(input) {
      calls.update.push(input);
      return updateResult;
    },
    async findOwned(id, ownerProfileId) {
      calls.findOwned.push({ id, ownerProfileId });
      return null;
    },
    async listForChallenge(challengeId) {
      calls.listForChallenge.push(challengeId);
      return [];
    },
  };

  return {
    repo,
    calls,
    setUpdateResult(e: StatEntry | null) {
      updateResult = e;
    },
  };
}

function makeFakeEntry(o: Partial<StatEntry>): StatEntry {
  return {
    id: o.id ?? "00000000-0000-0000-0000-000000000001",
    challengeId: o.challengeId ?? "00000000-0000-0000-0000-000000000010",
    profileId: o.profileId ?? "00000000-0000-0000-0000-000000000100",
    metric: o.metric ?? "weight_kg",
    value: o.value ?? 80,
    unit: o.unit ?? "kg",
    recordedAt: o.recordedAt ?? new Date("2026-05-19T10:00:00Z"),
    note: o.note ?? null,
    photoUrl: o.photoUrl ?? null,
  };
}

beforeEach(() => {
  ChallengeTypeFactory.reset();
  ChallengeTypeFactory.register(new FitnessStrategy());
});

afterEach(() => {
  ChallengeTypeFactory.reset();
});

describe("StatsService.update — DI + OCP boundaries", () => {
  it("validates with the strategy's statSchema and forwards a normalised payload", async () => {
    const { repo, calls, setUpdateResult } = makeFakeRepo();
    setUpdateResult(
      makeFakeEntry({ metric: "weight_kg", value: 78.5, unit: "kg" }),
    );
    const service = makeStatsService(repo);

    const result = await service.update(
      "fitness",
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      { metric: "weight_kg", value: 78.5, note: "after workout" },
      null,
    );

    expect(result?.value).toBe(78.5);
    expect(calls.update).toHaveLength(1);
    const call = calls.update[0]!;
    expect(call.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(call.ownerProfileId).toBe("22222222-2222-2222-2222-222222222222");
    expect(call.metric).toBe("weight_kg");
    expect(call.value).toBe(78.5);
    // unit is resolved from the strategy's MetricSpec — proves the factory
    // is the single source of truth for type-specific knowledge.
    expect(call.unit).toBe("kg");
    expect(call.note).toBe("after workout");
    expect(call.photoUrl).toBeNull();
  });

  it("rejects a metric that is not valid for the strategy (tampered submission)", async () => {
    const { repo } = makeFakeRepo();
    const service = makeStatsService(repo);

    await expect(
      service.update(
        "fitness",
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        // `pages_read` belongs to the reading strategy, not fitness.
        { metric: "pages_read", value: 100 },
        null,
      ),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it("returns null when the repo reports the row isn't owned by the caller", async () => {
    const { repo, setUpdateResult } = makeFakeRepo();
    setUpdateResult(null);
    const service = makeStatsService(repo);

    const result = await service.update(
      "fitness",
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      { metric: "weight_kg", value: 80 },
      null,
    );

    expect(result).toBeNull();
  });

  it("findOwnedEntry delegates to repo.findOwned with the same args", async () => {
    const { repo, calls } = makeFakeRepo();
    const service = makeStatsService(repo);

    await service.findOwnedEntry(
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    );

    expect(calls.findOwned).toEqual([
      {
        id: "11111111-1111-1111-1111-111111111111",
        ownerProfileId: "22222222-2222-2222-2222-222222222222",
      },
    ]);
  });
});
