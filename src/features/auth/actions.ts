"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/server/auth/server";

import {
  loginSchema,
  requestPasswordResetSchema,
  updatePasswordSchema,
} from "./schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function signInWithPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Check your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: "Wrong email or password." };
  }

  const next = (formData.get("next") as string | null) ?? "/dashboard";
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email." };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "localhost:3000"}`;

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
    },
  );

  if (error) {
    // Intentionally vague: don't leak which emails exist.
    return { ok: true };
  }
  return { ok: true };
}

export async function updatePassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid password.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Open the link again." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "Couldn't update password. Try again." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
