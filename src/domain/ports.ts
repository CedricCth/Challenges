/**
 * Ports (interfaces) the application layer depends on. Concrete adapters
 * (Drizzle-backed repos) live in src/features/*\/repo.ts. Per ADR-007
 * (DIP), we only put ports here for repos where unit-testable replacement
 * is useful — i.e. challenges + stats. Tiny CRUD (profiles, future
 * comments) can call Drizzle directly.
 */

import type {
  Challenge,
  ChallengeWithParticipants,
  StatEntry,
} from "./entities";

export interface CreateChallengeInput {
  title: string;
  description?: string | null;
  typeKey: string;
  goalMetric?: string | null;
  goalTarget?: number | null;
  goalDirection?: "higher" | "lower" | null;
  startDate?: string | null;
  endDate?: string | null;
  metadata?: Record<string, unknown>;
  createdBy: string;
  participantIds: string[];
}

export interface UpdateChallengeInput {
  title?: string;
  description?: string | null;
  goalMetric?: string | null;
  goalTarget?: number | null;
  goalDirection?: "higher" | "lower" | null;
  status?: Challenge["status"];
  startDate?: string | null;
  endDate?: string | null;
  metadata?: Record<string, unknown>;
}

export interface IChallengeRepo {
  findById(id: string): Promise<ChallengeWithParticipants | null>;
  findActiveForUser(userId: string): Promise<Challenge[]>;
  listForUser(userId: string): Promise<Challenge[]>;
  create(input: CreateChallengeInput): Promise<Challenge>;
  update(id: string, patch: UpdateChallengeInput): Promise<Challenge>;
  declareWinner(
    id: string,
    args: {
      winnerId: string | null;
      tie: boolean;
      winnerNote?: string | null;
      winnerPhotoUrl?: string | null;
    },
  ): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface AddStatInput {
  challengeId: string;
  profileId: string;
  metric: string;
  value: number;
  unit: string;
  note?: string | null;
  photoUrl?: string | null;
  recordedAt?: Date;
}

export interface UpdateStatInput {
  id: string;
  /** Repo-level ownership guard. The UPDATE will WHERE on this. */
  ownerProfileId: string;
  metric: string;
  value: number;
  unit: string;
  note: string | null;
  /** `null` clears the photo; an empty string is treated the same. */
  photoUrl: string | null;
  recordedAt?: Date;
}

export interface IStatsRepo {
  add(input: AddStatInput): Promise<StatEntry>;
  /**
   * Updates a stat entry only if `ownerProfileId` matches. Returns the
   * updated entity, or `null` when no row was touched (not owner / not
   * found). RLS enforces the same rule at the DB level.
   */
  update(input: UpdateStatInput): Promise<StatEntry | null>;
  /** Find an entry, scoped to its owner — used by the edit page for prefill. */
  findOwned(id: string, ownerProfileId: string): Promise<StatEntry | null>;
  listForChallenge(challengeId: string): Promise<StatEntry[]>;
}
