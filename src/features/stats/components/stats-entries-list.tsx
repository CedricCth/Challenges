import Image from "next/image";
import Link from "next/link";

import type { Profile, StatEntry } from "@/domain/entities";
import { formatLocalDay, formatNumber } from "@/lib/format";

import { DeleteEntryButton } from "./delete-entry-button";

interface EntryWithPhoto extends StatEntry {
  signedPhotoUrl: string | null;
}

export function StatsEntriesList({
  entries,
  profilesById,
  metricLabels,
  currentUserId,
}: {
  entries: EntryWithPhoto[];
  profilesById: Record<string, Profile>;
  metricLabels: Record<string, string>;
  /** When set, an Edit link is rendered on rows owned by this profile. */
  currentUserId?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No entries yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const profile = profilesById[e.profileId];
        const accent = profile?.color ?? "#94a3b8";
        const canEdit = currentUserId && e.profileId === currentUserId;
        return (
          <li
            key={e.id}
            className="flex items-start gap-3 rounded-md border p-3"
          >
            <span
              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium">
                  {profile?.displayName ?? e.profileId.slice(0, 6)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {metricLabels[e.metric] ?? e.metric}
                </span>
                <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  {formatLocalDay(e.recordedAt)}
                  {canEdit && (
                    <>
                      <Link
                        href={`/challenges/${e.challengeId}/stats/${e.id}/edit`}
                        className="underline hover:text-foreground"
                      >
                        Edit
                      </Link>
                      <DeleteEntryButton
                        challengeId={e.challengeId}
                        entryId={e.id}
                      />
                    </>
                  )}
                </span>
              </div>
              <p className="text-base">
                {formatNumber(e.value)}{" "}
                <span className="text-xs text-muted-foreground">{e.unit}</span>
              </p>
              {e.note && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {e.note}
                </p>
              )}
            </div>
            {e.signedPhotoUrl && (
              <a
                href={e.signedPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block shrink-0"
                aria-label="Photo"
              >
                <Image
                  src={e.signedPhotoUrl}
                  alt="Stat photo"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-md object-cover"
                  unoptimized
                />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
