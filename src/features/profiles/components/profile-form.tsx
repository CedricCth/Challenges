"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/domain/entities";
import { resizeImage } from "@/lib/image-resize";

import { saveProfile, type ActionResult } from "../actions";

export function ProfileForm({ initial }: { initial: Profile }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    saveProfile,
    null,
  );
  const [pending, startTransition] = useTransition();
  const [color, setColor] = useState(initial.color ?? "#2563EB");
  const [resizing, setResizing] = useState(false);
  const [clearAvatar, setClearAvatar] = useState(false);

  async function handleSubmit(formData: FormData) {
    const file = formData.get("avatar");
    if (file instanceof File && file.size > 0) {
      setResizing(true);
      try {
        const { file: resized } = await resizeImage(file);
        formData.set("avatar", resized);
      } catch {
        // Server still validates; fall through with the original file.
      } finally {
        setResizing(false);
      }
    } else {
      formData.delete("avatar");
    }
    if (clearAvatar) formData.set("clearAvatar", "1");
    startTransition(() => action(formData));
  }

  return (
    <form action={handleSubmit} className="space-y-5">
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
        <Label>Profile photo</Label>
        <div className="flex items-start gap-3">
          {initial.avatarUrl && !clearAvatar ? (
            <Image
              src={initial.avatarUrl}
              alt="Current avatar"
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
              style={{ backgroundColor: color }}
              aria-hidden
            >
              {initial.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
            />
            {initial.avatarUrl && !clearAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setClearAvatar(true)}
              >
                Remove current photo
              </Button>
            )}
            {clearAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setClearAvatar(false)}
              >
                Undo remove
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Resized in your browser before upload (longest side ≤ 1600 px,
          EXIF stripped). Or paste a URL below if you have one.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatarUrl">Avatar URL (alternative)</Label>
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={initial.avatarUrl ?? ""}
          placeholder="https://example.com/avatar.jpg"
        />
        <p className="text-xs text-muted-foreground">
          Only used if you don&apos;t pick a file above.
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
      {state?.ok && <p className="text-sm text-muted-foreground">Saved.</p>}

      <Button type="submit" disabled={pending || resizing}>
        {resizing ? "Resizing photo…" : pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
