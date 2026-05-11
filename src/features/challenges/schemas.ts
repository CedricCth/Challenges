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
  note: z.string().max(1000).optional(),
});
export type DeclareWinnerInput = z.infer<typeof declareWinnerSchema>;

export const ALLOWED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 1_500_000;

export const deleteChallengeSchema = z.object({
  challengeId: z.uuid(),
});
