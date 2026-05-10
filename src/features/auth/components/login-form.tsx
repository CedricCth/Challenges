"use client";

import { useActionState, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  signInWithPassword,
  requestPasswordReset,
  type ActionResult,
} from "../actions";
import { loginSchema, type LoginInput } from "../schemas";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [signInState, signInAction] = useActionState<
    ActionResult | null,
    FormData
  >(signInWithPassword, null);
  const [resetState, resetAction] = useActionState<
    ActionResult | null,
    FormData
  >(requestPasswordReset, null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (mode === "reset") {
    return (
      <form
        action={(formData) => startTransition(() => resetAction(formData))}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        {resetState?.ok && (
          <p className="text-sm text-muted-foreground">
            If that email is registered, a reset link is on its way.
          </p>
        )}
        {resetState?.ok === false && (
          <p className="text-sm text-destructive">{resetState.error}</p>
        )}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode("login")}
          >
            Back to login
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const fd = new FormData();
        fd.set("email", values.email);
        fd.set("password", values.password);
        if (next) fd.set("next", next);
        startTransition(() => signInAction(fd));
      })}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={() => setMode("reset")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      {signInState?.ok === false && (
        <p className="text-sm text-destructive">{signInState.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
