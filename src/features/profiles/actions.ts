"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/server/auth/server";
import { env } from "@/server/env";
import { updateProfile } from "./repo";
import { updateProfileSchema } from "./schemas";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const ALLOWED_AVATAR_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 1_500_000;

export async function saveProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The form sends either:
  //   - a new File under "avatar"     → upload to Storage, ignore avatarUrl
  //   - a URL under "avatarUrl"       → keep as-is
  //   - the special "clear" sentinel  → wipe the avatar
  // Either way, we resolve a single value to persist to profiles.avatar_url.
  const photoFile = formData.get("avatar");
  let avatarUrl: string | null | undefined = undefined; // undefined = don't change

  if (photoFile instanceof File && photoFile.size > 0) {
    if (!ALLOWED_AVATAR_MIME.includes(photoFile.type)) {
      return { ok: false, error: "Avatar must be JPEG, PNG or WebP." };
    }
    if (photoFile.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "Avatar is too large." };
    }
    const ext =
      photoFile.type === "image/png"
        ? "png"
        : photoFile.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${user.id}/avatar-${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, photoFile, {
        contentType: photoFile.type,
        upsert: false,
      });
    if (uploadErr) {
      return {
        ok: false,
        error: `Couldn't upload the avatar: ${uploadErr.message}`,
      };
    }
    // Public bucket → direct URL, no signing needed.
    avatarUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
  } else if (formData.get("clearAvatar") === "1") {
    avatarUrl = null;
  } else {
    // Fall back to the optional URL field (kept for back-compat / external
    // avatars), validated by the Zod schema below.
    const urlField = String(formData.get("avatarUrl") ?? "");
    if (urlField) avatarUrl = urlField;
  }

  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    color: formData.get("color") ?? "",
    avatarUrl: avatarUrl ?? "",
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
      avatarUrl: avatarUrl === null ? null : parsed.data.avatarUrl || null,
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
