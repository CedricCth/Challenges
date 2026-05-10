import "server-only";

import { ChallengeTypeFactory } from "@/features/challenges/factory";
import { FitnessStrategy } from "@/features/challenges/strategies/fitness";

/**
 * Composition root. The only place in the codebase that knows the full
 * list of registered challenge types and (later) wires repos to services.
 *
 * To add a new type:
 *   1) Create src/features/challenges/strategies/<type>.ts (extends BaseChallengeStrategy).
 *   2) Add one line below: ChallengeTypeFactory.register(new <Type>Strategy()).
 *   3) Insert a row into public.challenge_types (key matches the strategy's key).
 *
 * Everything else iterates the factory — no other file changes.
 */

// Guard against double-registration during HMR / re-imports in dev.
if (ChallengeTypeFactory.list().length === 0) {
  ChallengeTypeFactory.register(new FitnessStrategy());
}
