import { z } from "zod";

/**
 * Schemas that aren't strategy-specific. Per-strategy create/edit schemas
 * live on each ChallengeStrategy. These cover actions that every strategy
 * shares.
 */

export const declareWinnerSchema = z.object({
  challengeId: z.uuid(),
  outcome: z.enum(["winner", "tie"]),
  winnerId: z.uuid().optional(),
});
export type DeclareWinnerInput = z.infer<typeof declareWinnerSchema>;

export const deleteChallengeSchema = z.object({
  challengeId: z.uuid(),
});
