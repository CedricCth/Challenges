import type { z } from "zod";

import type {
  MetricSpec,
  ScoreInput,
  WinnerInput,
  WinnerResult,
} from "@/domain/entities";

import type { ChallengeStrategy } from "../strategy";

/**
 * Sensible defaults shared by most strategies. Concrete strategies override
 * what differs (typically just `computeScore`, the metrics list, and the
 * Zod schemas).
 */
export abstract class BaseChallengeStrategy implements ChallengeStrategy {
  abstract readonly key: string;
  abstract readonly label: string;
  abstract readonly icon: string;
  abstract readonly metrics: MetricSpec[];
  abstract readonly challengeSchema: z.ZodTypeAny;
  abstract readonly statSchema: z.ZodTypeAny;

  abstract computeScore(input: ScoreInput): number;

  /**
   * Default winner logic: highest score wins. Equal top scores = tie.
   * Strategies can override if e.g. they want a "first to hit goal" rule.
   */
  decideWinner(input: WinnerInput): WinnerResult {
    if (input.participants.length === 0) {
      return { tie: true };
    }
    const scored = input.participants.map((p) => ({
      id: p.profileId,
      score: this.computeScore(p),
    }));
    scored.sort((a, b) => b.score - a.score);

    if (scored.length >= 2 && scored[0].score === scored[1].score) {
      return { tie: true };
    }
    return { tie: false, winnerId: scored[0].id };
  }
}
