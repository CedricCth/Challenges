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
}

export interface IChallengeRepo {
  findById(id: string): Promise<ChallengeWithParticipants | null>;
  findActiveForUser(userId: string): Promise<Challenge[]>;
  create(input: CreateChallengeInput): Promise<Challenge>;
  declareWinner(id: string, winnerId: string | null): Promise<void>;
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

export interface IStatsRepo {
  add(input: AddStatInput): Promise<StatEntry>;
  listForChallenge(challengeId: string): Promise<StatEntry[]>;
}
