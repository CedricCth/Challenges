"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/server/auth/server";
import { markAllReadForUser } from "./repo";

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await markAllReadForUser(user.id);
  revalidatePath("/news");
  revalidatePath("/", "layout");
}
