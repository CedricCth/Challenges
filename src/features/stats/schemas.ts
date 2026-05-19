import { z } from "zod";

export const deleteStatEntrySchema = z.object({
  challengeId: z.uuid(),
  entryId: z.uuid(),
});

export const editStatEntryIdsSchema = z.object({
  challengeId: z.uuid(),
  entryId: z.uuid(),
});

export const ALLOWED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 1_500_000; // 1.5 MB hard cap (client resizes to ~1 MB)

/**
 * Hidden form field telling the server how to treat the photo on edit:
 *   keep    — leave the existing object alone
 *   remove  — set photo_url to null and delete the existing object
 *   replace — upload the new `photo` file, delete the existing object
 */
export const PHOTO_ACTIONS = ["keep", "remove", "replace"] as const;
export type PhotoAction = (typeof PHOTO_ACTIONS)[number];
