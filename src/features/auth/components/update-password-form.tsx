"use client";

import { useActionState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updatePassword, type ActionResult } from "../actions";

export function UpdatePasswordForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updatePassword,
    null,
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Repeat password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
