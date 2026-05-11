"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/server/auth/server";
import { updateProfile } from "./repo";
import { updateProfileSchema } from "./schemas";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    color: formData.get("color") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    await updateProfile(user.id, {
      displayName: parsed.data.displayName,
      color: parsed.data.color || null,
      avatarUrl: parsed.data.avatarUrl || null,
      bio: parsed.data.bio || null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Invalid input." };
    }
    console.error("[saveProfile] failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Couldn't save profile. Try again.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
