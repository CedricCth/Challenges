import "server-only";

import { ChallengeTypeFactory } from "@/features/challenges/factory";
import { challengeRepo } from "@/features/challenges/repo";
import { makeChallengeService } from "@/features/challenges/service";
import { FitnessStrategy } from "@/features/challenges/strategies/fitness";

/**
 * Composition root. The one place that knows the full list of challenge
 * types and wires repos -> services. Per ADR-007 (DIP), services depend
 * on `IXxxRepo`, not on Drizzle directly — this file injects the concrete
 * Drizzle implementation.
 *
 * To add a new challenge type:
 *   1) Create src/features/challenges/strategies/<type>.ts.
 *   2) Add one ChallengeTypeFactory.register(...) line below.
 *   3) Insert a row into public.challenge_types (key matches strategy.key).
 *
 * Every other file iterates the factory — nothing else changes.
 */

// Guard against double-registration during HMR / re-imports in dev.
if (ChallengeTypeFactory.list().length === 0) {
  ChallengeTypeFactory.register(new FitnessStrategy());
}

export const challengeService = makeChallengeService(challengeRepo);
