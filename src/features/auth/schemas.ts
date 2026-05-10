import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.email("Enter a valid email address."),
});
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Pick at least 8 characters."),
    confirm: z.string().min(1, "Repeat your password."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
