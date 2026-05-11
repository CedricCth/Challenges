import "server-only";

import { createClient } from "@/server/auth/server";

/**
 * Mint a 1-hour signed URL for a private stat-photo. Returns null if the
 * path is null/empty or signing fails.
 */
export async function signStatPhotoUrl(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("stat-photos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}
