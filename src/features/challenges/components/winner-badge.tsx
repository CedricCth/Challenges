import { Badge } from "@/components/ui/badge";
import type { Challenge, Profile } from "@/domain/entities";

export function WinnerBadge({
  challenge,
  profilesById,
}: {
  challenge: Challenge;
  profilesById: Record<string, Profile>;
}) {
  if (challenge.status !== "completed") {
    return (
      <Badge variant="secondary" className="capitalize">
        {challenge.status}
      </Badge>
    );
  }
  if (challenge.tie) {
    return <Badge variant="outline">Tie</Badge>;
  }
  if (challenge.winnerId) {
    const w = profilesById[challenge.winnerId];
    return (
      <Badge variant="default">
        {w?.displayName ?? "Winner"}
      </Badge>
    );
  }
  return <Badge variant="secondary">Completed</Badge>;
}
