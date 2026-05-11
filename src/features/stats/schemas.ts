import { z } from "zod";

export const deleteStatEntrySchema = z.object({
  challengeId: z.uuid(),
  entryId: z.uuid(),
});

export const ALLOWED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 1_500_000; // 1.5 MB hard cap (client resizes to ~1 MB)
