/**
 * Pure-TypeScript domain types. No imports from infrastructure (Drizzle,
 * Supabase) or framework (Next.js). These are the shapes the application
 * layer reasons about.
 */

export type GoalDirection = "higher" | "lower";
export type ChallengeStatus = "planned" | "active" | "completed" | "cancelled";

export interface Profile {
  id: string;
  displayName: string;
  color: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface MetricSpec {
  metric: string;
  unit: string;
  direction: GoalDirection;
  label: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  typeKey: string;
  goalMetric: string | null;
  goalTarget: number | null;
  goalDirection: GoalDirection | null;
  status: ChallengeStatus;
  startDate: string | null;
  endDate: string | null;
  winnerId: string | null;
  tie: boolean;
  winnerNote: string | null;
  winnerPhotoUrl: string | null;
  coverImageUrl: string | null;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatEntry {
  id: string;
  challengeId: string;
  profileId: string;
  metric: string;
  value: number;
  unit: string;
  recordedAt: Date;
  note: string | null;
  photoUrl: string | null;
}

export interface Participant {
  profileId: string;
  startingValue: number | null;
  entries: StatEntry[];
}

/**
 * What a strategy needs to compute a participant's progress score.
 */
export interface ScoreInput {
  profileId: string;
  startingValue: number | null;
  entries: StatEntry[];
  goal: {
    metric: string;
    target: number;
    direction: GoalDirection;
  };
}

export interface WinnerInput {
  participants: ScoreInput[];
}

export type WinnerResult =
  | { tie: true; winnerId?: undefined }
  | { tie: false; winnerId: string };

export interface ChallengeWithParticipants extends Challenge {
  participants: Participant[];
}
