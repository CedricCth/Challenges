import "server-only";

import { ChallengeTypeFactory } from "@/features/challenges/factory";
import type { IStatsRepo } from "@/domain/ports";

export function makeStatsService(repo: IStatsRepo) {
  return {
    /**
     * Validates a raw stat-entry payload against the strategy's `statSchema`
     * (single source of truth — the form uses the same schema).
     */
    async add(
      typeKey: string,
      challengeId: string,
      profileId: string,
      rawInput: unknown,
      photoUrl: string | null,
      recordedAt?: Date,
    ) {
      const strategy = ChallengeTypeFactory.get(typeKey);
      const parsed = strategy.statSchema.parse(rawInput) as {
        metric: string;
        value: number;
        note?: string;
      };

      const unit =
        strategy.metrics.find((m) => m.metric === parsed.metric)?.unit ?? "";

      return repo.add({
        challengeId,
        profileId,
        metric: parsed.metric,
        value: parsed.value,
        unit,
        note: parsed.note ?? null,
        photoUrl,
        recordedAt,
      });
    },

    listForChallenge: repo.listForChallenge.bind(repo),
  };
}

export type StatsService = ReturnType<typeof makeStatsService>;
