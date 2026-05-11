"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/server/auth/server";
import { statsService } from "@/server/composition";
import { isParticipantOrCreator } from "@/features/challenges/repo";
import { challengeRepo } from "@/features/challenges/repo";
import { deleteStatEntry as repoDeleteStatEntry } from "./repo";
import {
  ALLOWED_PHOTO_MIME,
  MAX_PHOTO_BYTES,
  deleteStatEntrySchema,
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

  // Optional photo upload. Validate MIME + size on the server (the client
  // resizes + re-encodes, but we don't trust the client).
  const photoFile = formData.get("photo");
  let photoUrl: string | null = null;
  if (photoFile instanceof File && photoFile.size > 0) {
    if (!ALLOWED_PHOTO_MIME.includes(photoFile.type)) {
      return {
        ok: false,
        error: "Photo must be JPEG, PNG or WebP.",
      };
    }
    if (photoFile.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: "Photo is too large." };
    }

    const supabase = await createClient();
    const ext = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
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
    photoUrl = path; // store the path; we sign on read.
  }

  try {
    await statsService.add(
      challenge.typeKey,
      challengeId,
      userId,
      rawInput,
      photoUrl,
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

  const ok = await repoDeleteStatEntry(parsed.data.entryId, userId);
  if (!ok) return { ok: false, error: "You can only delete your own entries." };

  revalidatePath(`/challenges/${parsed.data.challengeId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

