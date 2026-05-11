"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/domain/entities";

import { saveProfile, type ActionResult } from "../actions";

export function ProfileForm({ initial }: { initial: Profile }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    saveProfile,
    null,
  );
  const [pending, startTransition] = useTransition();
  const [color, setColor] = useState(initial.color ?? "#2563EB");

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          defaultValue={initial.displayName}
          maxLength={40}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Accent colour</Label>
        <div className="flex items-center gap-3">
          <input
            id="color"
            name="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
            aria-label="Accent colour"
          />
          <code className="text-sm tabular-nums">{color.toUpperCase()}</code>
        </div>
        <p className="text-xs text-muted-foreground">
          Used for your line on the chart and your badge.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={initial.avatarUrl ?? ""}
          placeholder="https://example.com/avatar.jpg"
        />
        <p className="text-xs text-muted-foreground">
          File uploads land in Phase 8. For now, paste a URL.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio (optional)</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          defaultValue={initial.bio ?? ""}
          placeholder="A line about you for the About Us page."
        />
      </div>

      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-muted-foreground">Saved.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
