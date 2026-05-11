"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { challengeService } from "@/server/composition";
import { createClient } from "@/server/auth/server";
import { isParticipantOrCreator } from "./repo";
import { declareWinnerSchema, deleteChallengeSchema } from "./schemas";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function getUserIdOrThrow(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return user.id;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createChallenge(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserIdOrThrow();

  const typeKey = String(formData.get("typeKey") ?? "");
  if (!typeKey) {
    return { ok: false, error: "Pick a challenge type." };
  }

  const rawInput = {
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    goalMetric: formData.get("goalMetric"),
    goalTarget: Number(formData.get("goalTarget") ?? 0),
    goalDirection: formData.get("goalDirection"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  };

  const participantIds = formData
    .getAll("participantIds")
    .map((v) => String(v))
    .filter(Boolean);

  // NOTE: `redirect()` throws NEXT_REDIRECT; do not put it inside try/catch
  // or the catch will swallow it and show a false-negative error.
  let challengeId: string;
  try {
    const challenge = await challengeService.create(
      userId,
      typeKey,
      rawInput,
      participantIds,
    );
    challengeId = challenge.id;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: err.issues[0]?.message ?? "Check the form for errors.",
      };
    }
    console.error("[createChallenge] failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Couldn't create the challenge. Try again.",
    };
  }

  revalidatePath("/challenges");
  revalidatePath("/dashboard");
  redirect(`/challenges/${challengeId}`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateChallenge(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserIdOrThrow();
  const id = String(formData.get("id") ?? "");
  const typeKey = String(formData.get("typeKey") ?? "");

  if (!id || !typeKey) {
    return { ok: false, error: "Missing required fields." };
  }
  if (!(await isParticipantOrCreator(id, userId))) {
    return { ok: false, error: "You can't edit this challenge." };
  }

  const rawInput = {
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    goalMetric: formData.get("goalMetric"),
    goalTarget: Number(formData.get("goalTarget") ?? 0),
    goalDirection: formData.get("goalDirection"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  };

  try {
    await challengeService.update(id, typeKey, rawInput);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: err.issues[0]?.message ?? "Check the form for errors.",
      };
    }
    console.error("[updateChallenge] failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Couldn't save changes. Try again.",
    };
  }

  revalidatePath("/challenges");
  revalidatePath(`/challenges/${id}`);
  redirect(`/challenges/${id}`);
}

// ---------------------------------------------------------------------------
// Declare winner
// ---------------------------------------------------------------------------

export async function declareWinner(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserIdOrThrow();

  const parsed = declareWinnerSchema.safeParse({
    challengeId: formData.get("challengeId"),
    outcome: formData.get("outcome"),
    winnerId: formData.get("winnerId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Pick a winner or a tie." };
  }
  const { challengeId, outcome, winnerId } = parsed.data;
  if (outcome === "winner" && !winnerId) {
    return { ok: false, error: "Pick which of you won." };
  }
  if (!(await isParticipantOrCreator(challengeId, userId))) {
    return { ok: false, error: "You can't declare a winner here." };
  }

  await challengeService.declareWinner(challengeId, {
    winnerId: outcome === "tie" ? null : winnerId ?? null,
    tie: outcome === "tie",
  });

  revalidatePath("/challenges");
  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteChallenge(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserIdOrThrow();

  const parsed = deleteChallengeSchema.safeParse({
    challengeId: formData.get("challengeId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Bad request." };
  }
  if (!(await isParticipantOrCreator(parsed.data.challengeId, userId))) {
    return { ok: false, error: "You can't delete this challenge." };
  }

  await challengeService.delete(parsed.data.challengeId);
  revalidatePath("/challenges");
  revalidatePath("/dashboard");
  redirect("/challenges");
}
