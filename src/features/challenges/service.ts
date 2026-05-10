import "server-only";

import { ChallengeTypeFactory } from "./factory";
import type { IChallengeRepo } from "@/domain/ports";

/**
 * Application-layer service. Wires the factory + repo so that:
 *   - input is validated by the strategy's Zod schema (single source of truth)
 *   - the repo only ever sees clean, typed input
 *
 * `userId` is the caller's profile id; pass it from a Server Action that has
 * just verified `getUser()` (defence-in-depth layer 2 per ADR-004).
 */
export function makeChallengeService(repo: IChallengeRepo) {
  return {
    async create(
      userId: string,
      typeKey: string,
      rawInput: unknown,
      participantIds: string[],
    ) {
      const strategy = ChallengeTypeFactory.get(typeKey);
      const parsed = strategy.challengeSchema.parse(rawInput) as {
        title: string;
        description?: string;
        goalMetric: string;
        goalTarget: number;
        goalDirection: "higher" | "lower";
        startDate: Date;
        endDate: Date;
      };

      return repo.create({
        title: parsed.title,
        description: parsed.description ?? null,
        typeKey,
        goalMetric: parsed.goalMetric,
        goalTarget: parsed.goalTarget,
        goalDirection: parsed.goalDirection,
        startDate: parsed.startDate.toISOString().slice(0, 10),
        endDate: parsed.endDate.toISOString().slice(0, 10),
        metadata: { schema_version: 1 },
        createdBy: userId,
        participantIds,
      });
    },

    async update(id: string, typeKey: string, rawInput: unknown) {
      const strategy = ChallengeTypeFactory.get(typeKey);
      const parsed = strategy.challengeSchema.parse(rawInput) as {
        title: string;
        description?: string;
        goalMetric: string;
        goalTarget: number;
        goalDirection: "higher" | "lower";
        startDate: Date;
        endDate: Date;
      };

      return repo.update(id, {
        title: parsed.title,
        description: parsed.description ?? null,
        goalMetric: parsed.goalMetric,
        goalTarget: parsed.goalTarget,
        goalDirection: parsed.goalDirection,
        startDate: parsed.startDate.toISOString().slice(0, 10),
        endDate: parsed.endDate.toISOString().slice(0, 10),
      });
    },

    async declareWinner(
      id: string,
      args: { winnerId: string | null; tie: boolean },
    ) {
      return repo.declareWinner(id, args);
    },

    async delete(id: string) {
      return repo.delete(id);
    },

    findById: repo.findById.bind(repo),
    findActiveForUser: repo.findActiveForUser.bind(repo),
    listForUser: repo.listForUser.bind(repo),
  };
}

export type ChallengeService = ReturnType<typeof makeChallengeService>;
