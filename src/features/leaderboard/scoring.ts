import type {
  Challenge,
  ChallengeWithParticipants,
  Profile,
  ScoreInput,
} from "@/domain/entities";
import { ChallengeTypeFactory } from "@/features/challenges/factory";

/**
 * Pinned definitions per docs/07-PROJECT-PLAN.md Phase 7 — do not invent your
 * own. These are the *only* metrics shown on the leaderboard.
 *
 *   - Total wins: count(challenges where winner_id = profile.id).
 *   - Win rate: wins / completed_challenges_participated_in (excluding ties
 *     and cancelled).
 *   - Longest streak: longest run of consecutive *completed* challenges
 *     (in end_date order) where the same person won. A tie breaks the streak.
 *   - Biggest comeback: challenge where the eventual winner had the lower
 *     computeScore at the chronological midpoint and still ended up winning.
 */

export interface LeaderboardEntry {
  profile: Profile;
  totalWins: number;
  winRate: number; // 0..1; null if no completed challenges
  longestStreak: number;
  /** True if this person is currently on the longest streak (last completed challenge winner). */
  onCurrentStreak: boolean;
}

export interface BiggestComeback {
  challenge: Challenge;
  winner: Profile;
  /** Score margin at midpoint where the eventual winner was behind. */
  midpointDeficit: number;
}

export interface LeaderboardSummary {
  entries: LeaderboardEntry[];
  biggestComeback: BiggestComeback | null;
  completedCount: number;
  tieCount: number;
}

export function computeLeaderboard(
  challenges: ChallengeWithParticipants[],
  profiles: Profile[],
): LeaderboardSummary {
  const completed = challenges.filter((c) => c.status === "completed");

  // ---------------------------------------------------------------------------
  // Total wins (winner_id !== null and not a tie).
  // ---------------------------------------------------------------------------
  const winsById = new Map<string, number>();
  // Completed challenges each profile participated in (denominator for win rate).
  const completedParticipatedById = new Map<string, number>();
  let tieCount = 0;

  for (const c of completed) {
    if (c.tie) {
      tieCount += 1;
    } else if (c.winnerId) {
      winsById.set(c.winnerId, (winsById.get(c.winnerId) ?? 0) + 1);
    }
    for (const p of c.participants) {
      completedParticipatedById.set(
        p.profileId,
        (completedParticipatedById.get(p.profileId) ?? 0) + 1,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Longest streak: walk completed challenges in end_date order. A tie or a
  // different winner breaks the streak.
  // ---------------------------------------------------------------------------
  const sortedByEnd = [...completed]
    .filter((c) => c.endDate)
    .sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));

  const longestByProfile = new Map<string, number>();
  let runWinner: string | null = null;
  let runLen = 0;
  let lastWinnerOfFinalRun: string | null = null;
  for (const c of sortedByEnd) {
    if (c.tie || !c.winnerId) {
      runWinner = null;
      runLen = 0;
      continue;
    }
    if (c.winnerId === runWinner) {
      runLen += 1;
    } else {
      runWinner = c.winnerId;
      runLen = 1;
    }
    const best = longestByProfile.get(runWinner) ?? 0;
    if (runLen > best) longestByProfile.set(runWinner, runLen);
    lastWinnerOfFinalRun = runWinner;
  }

  const entries: LeaderboardEntry[] = profiles.map((profile) => {
    const totalWins = winsById.get(profile.id) ?? 0;
    const denom = completedParticipatedById.get(profile.id) ?? 0;
    const winRate = denom > 0 ? totalWins / denom : 0;
    return {
      profile,
      totalWins,
      winRate,
      longestStreak: longestByProfile.get(profile.id) ?? 0,
      onCurrentStreak: lastWinnerOfFinalRun === profile.id,
    };
  });

  // Sort: most wins first, then by win rate.
  entries.sort(
    (a, b) =>
      b.totalWins - a.totalWins ||
      b.winRate - a.winRate ||
      a.profile.displayName.localeCompare(b.profile.displayName),
  );

  // ---------------------------------------------------------------------------
  // Biggest comeback: of all completed non-tie challenges, find the one where
  // the eventual winner had the lower computeScore at the chronological
  // midpoint, with the largest deficit.
  // ---------------------------------------------------------------------------
  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));
  let biggestComeback: BiggestComeback | null = null;

  for (const c of completed) {
    if (c.tie || !c.winnerId || !ChallengeTypeFactory.has(c.typeKey)) continue;
    if (!c.startDate || !c.endDate || c.participants.length < 2) continue;

    const midpoint = midpointDate(c.startDate, c.endDate);
    if (!midpoint) continue;

    const strategy = ChallengeTypeFactory.get(c.typeKey);
    if (!c.goalMetric || c.goalTarget == null || !c.goalDirection) continue;

    const goal = {
      metric: c.goalMetric,
      target: c.goalTarget,
      direction: c.goalDirection,
    };

    const scoresAtMidpoint = c.participants.map((p): { id: string; score: number } => {
      const entriesBeforeMidpoint = p.entries.filter(
        (e) => e.recordedAt.getTime() <= midpoint.getTime(),
      );
      const input: ScoreInput = {
        profileId: p.profileId,
        startingValue: p.startingValue,
        entries: entriesBeforeMidpoint,
        goal,
      };
      return { id: p.profileId, score: strategy.computeScore(input) };
    });

    const winnerMid = scoresAtMidpoint.find((s) => s.id === c.winnerId);
    if (!winnerMid) continue;
    const leaderMid = scoresAtMidpoint.reduce((a, b) =>
      b.score > a.score ? b : a,
    );
    if (leaderMid.id === c.winnerId) continue; // wasn't behind, not a comeback.

    const deficit = leaderMid.score - winnerMid.score;
    if (!biggestComeback || deficit > biggestComeback.midpointDeficit) {
      const winnerProfile = profilesById[c.winnerId];
      if (winnerProfile) {
        biggestComeback = {
          challenge: c,
          winner: winnerProfile,
          midpointDeficit: deficit,
        };
      }
    }
  }

  return {
    entries,
    biggestComeback,
    completedCount: completed.length,
    tieCount,
  };
}

function midpointDate(start: string, end: string): Date | null {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return new Date((s + e) / 2);
}
