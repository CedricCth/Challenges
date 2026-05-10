import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Challenge, Profile } from "@/domain/entities";
import { formatLocalDay } from "@/lib/format";

import { WinnerBadge } from "./winner-badge";

export function ChallengeCard({
  challenge,
  profilesById,
}: {
  challenge: Challenge;
  profilesById: Record<string, Profile>;
}) {
  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="block transition-colors hover:bg-accent/40 rounded-xl"
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">{challenge.title}</CardTitle>
            <CardDescription className="text-xs">
              {formatLocalDay(challenge.startDate)} →{" "}
              {formatLocalDay(challenge.endDate)}
            </CardDescription>
          </div>
          <WinnerBadge challenge={challenge} profilesById={profilesById} />
        </CardHeader>
        {challenge.description && (
          <CardContent className="text-sm text-muted-foreground">
            <p className="line-clamp-2">{challenge.description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
