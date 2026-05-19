"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/server/auth/server";
import { statsService } from "@/server/composition";
import { isParticipantOrCreator } from "@/features/challenges/repo";
import { challengeRepo } from "@/features/challenges/repo";
import { notifyChallengeParticipants } from "@/features/notifications/producer";
import { deleteStatEntry as repoDeleteStatEntry } from "./repo";
import {
  ALLOWED_PHOTO_MIME,
  MAX_PHOTO_BYTES,
  PHOTO_ACTIONS,
  deleteStatEntrySchema,
  editStatEntryIdsSchema,
  type PhotoAction,
} from "./schemas";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function getUserIdOrThrow(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

/**
 * Parses `recordedAt` from a FormData field. Returns the date (or undefined
 * if the field is empty), or a stringified error message via the result type.
 *
 * `<input type="datetime-local">` sends "YYYY-MM-DDTHH:mm" with no tz, but
 * the client converts to full ISO before submitting (see stats-form.tsx).
 * We still allow 24h ahead as a typo guard for any stragglers.
 */
function parseRecordedAt(
  raw: FormDataEntryValue | null,
): { ok: true; date: Date | undefined } | { ok: false; error: string } {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: true, date: undefined };
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "That date doesn't look right." };
  }
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return { ok: false, error: "Can't log an entry that far in the future." };
  }
  return { ok: true, date: d };
}

/**
 * Validates and uploads a photo File. Returns the storage path on success
 * or an error string on failure. Caller is responsible for passing through
 * `null` when the form had no photo field.
 */
async function uploadPhoto(
  photoFile: File,
  challengeId: string,
  userId: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!ALLOWED_PHOTO_MIME.includes(photoFile.type)) {
    return { ok: false, error: "Photo must be JPEG, PNG or WebP." };
  }
  if (photoFile.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo is too large." };
  }
  const supabase = await createClient();
  const ext =
    photoFile.type === "image/png"
      ? "png"
      : photoFile.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${challengeId}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("stat-photos")
    .upload(path, photoFile, {
      contentType: photoFile.type,
      upsert: false,
    });
  if (uploadErr) {
    return {
      ok: false,
      error: `Couldn't upload the photo: ${uploadErr.message}`,
    };
  }
  return { ok: true, path };
}

/** Best-effort delete of a previously uploaded photo. Logs on failure. */
async function deletePhotoObject(storagePath: string | null): Promise<void> {
  if (!storagePath) return;
  try {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from("stat-photos")
      .remove([storagePath]);
    if (error) {
      console.warn("[deletePhotoObject] non-fatal:", error.message);
    }
  } catch (err) {
    console.warn("[deletePhotoObject] non-fatal:", err);
  }
}

export async function addStatEntry(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserIdOrThrow();
  const challengeId = String(formData.get("challengeId") ?? "");
  if (!challengeId) {
    return { ok: false, error: "Missing challenge id." };
  }
  if (!(await isParticipantOrCreator(challengeId, userId))) {
    return { ok: false, error: "You're not in this challenge." };
  }

  const challenge = await challengeRepo.findById(challengeId);
  if (!challenge) {
    return { ok: false, error: "Challenge not found." };
  }

  const rawInput = {
    metric: formData.get("metric"),
    value: Number(formData.get("value") ?? 0),
    note: (formData.get("note") as string | null) || undefined,
  };

  const parsedDate = parseRecordedAt(formData.get("recordedAt"));
  if (!parsedDate.ok) return { ok: false, error: parsedDate.error };
  const recordedAt = parsedDate.date;

  let photoUrl: string | null = null;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const uploaded = await uploadPhoto(photoFile, challengeId, userId);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };
    photoUrl = uploaded.path;
  }

  let savedEntry: Awaited<ReturnType<typeof statsService.add>> | null = null;
  try {
    savedEntry = await statsService.add(
      challenge.typeKey,
      challengeId,
      userId,
      rawInput,
      photoUrl,
      recordedAt,
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: err.issues[0]?.message ?? "Check the form for errors.",
      };
    }
    console.error("[addStatEntry] failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Couldn't save the entry. Try again.",
    };
  }

  if (savedEntry) {
    await notifyChallengeParticipants({
      actorId: userId,
      challengeId,
      kind: "stat_added",
      payload: {
        metric: savedEntry.metric,
        value: savedEntry.value,
        unit: savedEntry.unit,
      },
    });
  }

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  redirect(`/challenges/${challengeId}`);
}

export async function editStatEntry(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserIdOrThrow();

  const ids = editStatEntryIdsSchema.safeParse({
    challengeId: formData.get("challengeId"),
    entryId: formData.get("entryId"),
  });
  if (!ids.success) return { ok: false, error: "Bad request." };
  const { challengeId, entryId } = ids.data;

  if (!(await isParticipantOrCreator(challengeId, userId))) {
    return { ok: false, error: "You're not in this challenge." };
  }

  const challenge = await challengeRepo.findById(challengeId);
  if (!challenge) {
    return { ok: false, error: "Challenge not found." };
  }

  const rawInput = {
    metric: formData.get("metric"),
    value: Number(formData.get("value") ?? 0),
    note: (formData.get("note") as string | null) || undefined,
  };

  const parsedDate = parseRecordedAt(formData.get("recordedAt"));
  if (!parsedDate.ok) return { ok: false, error: parsedDate.error };
  const recordedAt = parsedDate.date;

  const photoActionRaw = String(formData.get("photoAction") ?? "keep");
  const photoAction: PhotoAction = (PHOTO_ACTIONS as readonly string[]).includes(
    photoActionRaw,
  )
    ? (photoActionRaw as PhotoAction)
    : "keep";
  const existingPhotoUrl =
    (formData.get("existingPhotoUrl") as string | null) || null;

  let nextPhotoUrl: string | null = existingPhotoUrl;
  let oldPhotoToDelete: string | null = null;

  if (photoAction === "remove") {
    nextPhotoUrl = null;
    oldPhotoToDelete = existingPhotoUrl;
  } else if (photoAction === "replace") {
    const photoFile = formData.get("photo");
    if (!(photoFile instanceof File) || photoFile.size === 0) {
      return {
        ok: false,
        error: "Pick a new photo, or choose Keep / Remove instead.",
      };
    }
    const uploaded = await uploadPhoto(photoFile, challengeId, userId);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };
    nextPhotoUrl = uploaded.path;
    oldPhotoToDelete = existingPhotoUrl;
  }

  let updated: Awaited<ReturnType<typeof statsService.update>> = null;
  try {
    updated = await statsService.update(
      challenge.typeKey,
      entryId,
      userId,
      rawInput,
      nextPhotoUrl,
      recordedAt,
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Roll back any freshly uploaded photo so we don't leak an orphan.
      if (photoAction === "replace" && nextPhotoUrl) {
        await deletePhotoObject(nextPhotoUrl);
      }
      return {
        ok: false,
        error: err.issues[0]?.message ?? "Check the form for errors.",
      };
    }
    console.error("[editStatEntry] failed:", err);
    if (photoAction === "replace" && nextPhotoUrl) {
      await deletePhotoObject(nextPhotoUrl);
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Couldn't save the entry. Try again.",
    };
  }

  if (!updated) {
    // Repo signalled not-owner / not-found. Clean up any new upload so we
    // don't leave an orphan in storage.
    if (photoAction === "replace" && nextPhotoUrl) {
      await deletePhotoObject(nextPhotoUrl);
    }
    return { ok: false, error: "You can only edit your own entries." };
  }

  // DB write succeeded — now safe to drop the old object.
  if (oldPhotoToDelete) {
    await deletePhotoObject(oldPhotoToDelete);
  }

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  redirect(`/challenges/${challengeId}`);
}

export async function deleteStatEntry(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserIdOrThrow();
  const parsed = deleteStatEntrySchema.safeParse({
    challengeId: formData.get("challengeId"),
    entryId: formData.get("entryId"),
  });
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const deleted = await repoDeleteStatEntry(parsed.data.entryId, userId);
  if (!deleted) {
    return { ok: false, error: "You can only delete your own entries." };
  }

  // DB row gone — drop the photo too so we don't leak Storage objects.
  if (deleted.photoUrl) {
    await deletePhotoObject(deleted.photoUrl);
  }

  // Symmetric with addStatEntry: tell the other participants. If we
  // notified on creation but stayed silent on deletion, their news feed
  // would point at an entry that no longer exists.
  await notifyChallengeParticipants({
    actorId: userId,
    challengeId: parsed.data.challengeId,
    kind: "stat_deleted",
    payload: {
      metric: deleted.metric,
      value: deleted.value,
      unit: deleted.unit,
    },
  });

  revalidatePath(`/challenges/${parsed.data.challengeId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
