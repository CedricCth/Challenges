import type { z } from "zod";

import type {
  MetricSpec,
  ScoreInput,
  WinnerInput,
  WinnerResult,
} from "@/domain/entities";

/**
 * One file per challenge type. New types are added by writing a class that
 * implements this interface, then registering it in src/server/composition.ts.
 * The factory does the rest — no other file changes when a type is added.
 *
 * See ADR-006 (Factory + Strategy) and docs/06-CODING-STANDARDS.md.
 */
export interface ChallengeStrategy {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly metrics: MetricSpec[];

  /** Zod schema for the create-challenge form. */
  readonly challengeSchema: z.ZodTypeAny;

  /** Zod schema for a single stat-entry form submission. */
  readonly statSchema: z.ZodTypeAny;

  /** 0..1 where 1 = goal met. Higher is better progress. */
  computeScore(input: ScoreInput): number;

  /** Pick a winner (or call it a tie) from the participants' progress. */
  decideWinner(input: WinnerInput): WinnerResult;
}

/**
 * Helper: returns the last numeric value recorded for `metric` from a sorted
 * list of entries (most recent last). Used by computeScore.
 */
export function lastValueOf(
  entries: ScoreInput["entries"],
  metric: string,
): number | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].metric === metric) return entries[i].value;
  }
  return null;
}
