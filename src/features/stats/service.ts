import "server-only";

import { ChallengeTypeFactory } from "@/features/challenges/factory";
import type { IStatsRepo } from "@/domain/ports";

/**
 * Runs the strategy's `statSchema` over a raw payload. Centralised so add
 * and update share the exact same validation surface — that's the OCP
 * guarantee: a new type's edit path inherits its validation for free.
 */
function parseStatPayload(typeKey: string, rawInput: unknown) {
  const strategy = ChallengeTypeFactory.get(typeKey);
  const parsed = strategy.statSchema.parse(rawInput) as {
    metric: string;
    value: number;
    note?: string;
  };
  const unit =
    strategy.metrics.find((m) => m.metric === parsed.metric)?.unit ?? "";
  return { parsed, unit };
}

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
      const { parsed, unit } = parseStatPayload(typeKey, rawInput);
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

    /**
     * Updates an existing entry. Re-runs the strategy's `statSchema` so a
     * tampered submission (e.g. a fitness entry being edited to a reading
     * metric) is rejected with the same rules as creation. Returns `null`
     * when the row isn't owned by `profileId` — defence in depth on top of
     * the `stats update own` RLS policy.
     */
    async update(
      typeKey: string,
      entryId: string,
      profileId: string,
      rawInput: unknown,
      photoUrl: string | null,
      recordedAt?: Date,
    ) {
      const { parsed, unit } = parseStatPayload(typeKey, rawInput);
      return repo.update({
        id: entryId,
        ownerProfileId: profileId,
        metric: parsed.metric,
        value: parsed.value,
        unit,
        note: parsed.note ?? null,
        photoUrl,
        recordedAt,
      });
    },

    findOwnedEntry: repo.findOwned.bind(repo),
    listForChallenge: repo.listForChallenge.bind(repo),
  };
}

export type StatsService = ReturnType<typeof makeStatsService>;
