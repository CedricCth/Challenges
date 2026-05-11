import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex like #1E40AF.")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.url("Must be a valid URL.").optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
});
export type UpdateProfileInputForm = z.infer<typeof updateProfileSchema>;
