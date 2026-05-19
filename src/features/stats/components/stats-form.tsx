"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resizeImage } from "@/lib/image-resize";

import { addStatEntry, type ActionResult } from "../actions";
import type { PhotoAction } from "../schemas";

interface MetricOption {
  metric: string;
  label: string;
  unit: string;
}

export interface StatsFormDefaults {
  entryId: string;
  metric: string;
  value: number;
  note: string | null;
  /** ISO string (timezone-aware) — see formatToLocalIsoInput below. */
  recordedAt: string;
  /** Storage path saved on the entry; null if no photo currently. */
  existingPhotoUrl: string | null;
  /** Time-limited signed URL for the thumbnail preview, or null. */
  signedPhotoUrl: string | null;
}

export type StatsFormAction = (
  prev: ActionResult | null,
  fd: FormData,
) => Promise<ActionResult>;

/**
 * Generic form for adding *or* editing a stat entry. The server action is
 * injected as a prop — the form itself doesn't import any specific action,
 * so add/edit/(future) variants reuse the same UI surface (OCP).
 */
export function StatsForm({
  challengeId,
  metrics,
  defaultMetric,
  action = addStatEntry,
  defaults,
  submitLabel,
  cancelHref,
}: {
  challengeId: string;
  metrics: MetricOption[];
  defaultMetric?: string;
  action?: StatsFormAction;
  defaults?: StatsFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const isEdit = Boolean(defaults);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );
  const [pending, startTransition] = useTransition();
  const [metric, setMetric] = useState(
    defaults?.metric ?? defaultMetric ?? metrics[0]?.metric ?? "",
  );
  const [resizing, setResizing] = useState(false);
  // Default to "keep" in every case. If the entry already has a photo, the
  // user picks Keep / Replace / Remove via radios. If it has no photo, the
  // file input below flips this to "replace" only when a file is actually
  // chosen — so submitting with an empty picker just keeps the null photo.
  const [photoAction, setPhotoAction] = useState<PhotoAction>("keep");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUnit = metrics.find((m) => m.metric === metric)?.unit ?? "";

  const defaultLocalIso = defaults?.recordedAt
    ? formatToLocalIsoInput(defaults.recordedAt)
    : nowLocalIso();

  async function handleSubmit(formData: FormData) {
    // Photo handling differs between add and edit:
    // - add:  if a file is chosen, resize; else delete the empty File.
    // - edit: only resize when photoAction === "replace". For keep/remove
    //         strip the field so the server doesn't see it.
    if (isEdit) {
      if (photoAction === "replace") {
        const file = formData.get("photo");
        if (file instanceof File && file.size > 0) {
          setResizing(true);
          try {
            const { file: resized } = await resizeImage(file);
            formData.set("photo", resized);
          } catch {
            // fall through with original
          } finally {
            setResizing(false);
          }
        }
      } else {
        formData.delete("photo");
      }
    } else {
      const file = formData.get("photo");
      if (file instanceof File && file.size > 0) {
        setResizing(true);
        try {
          const { file: resized } = await resizeImage(file);
          formData.set("photo", resized);
        } catch {
          // fall through with original
        } finally {
          setResizing(false);
        }
      } else {
        formData.delete("photo");
      }
    }

    // datetime-local sends "YYYY-MM-DDTHH:mm" with no timezone info. The
    // server's `new Date(...)` would interpret that as UTC. Convert to a
    // full ISO (with TZ offset baked in) so server parses the same instant.
    const recordedAtRaw = formData.get("recordedAt");
    if (typeof recordedAtRaw === "string" && recordedAtRaw.length > 0) {
      const localDate = new Date(recordedAtRaw);
      if (!Number.isNaN(localDate.getTime())) {
        formData.set("recordedAt", localDate.toISOString());
      }
    }

    startTransition(() => formAction(formData));
  }

  const effectiveSubmitLabel =
    submitLabel ?? (isEdit ? "Save changes" : "Add entry");

  return (
    <form action={handleSubmit} className="space-y-5">
      <input type="hidden" name="challengeId" value={challengeId} />
      {defaults && (
        <>
          <input type="hidden" name="entryId" value={defaults.entryId} />
          <input
            type="hidden"
            name="existingPhotoUrl"
            value={defaults.existingPhotoUrl ?? ""}
          />
          <input type="hidden" name="photoAction" value={photoAction} />
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="metric">Metric</Label>
        <select
          id="metric"
          name="metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          required
        >
          {metrics.map((m) => (
            <option key={m.metric} value={m.metric}>
              {m.label} ({m.unit})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="value">
          Value
          {currentUnit && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({currentUnit})
            </span>
          )}
        </Label>
        <Input
          id="value"
          name="value"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          required
          placeholder="e.g. 79.4"
          defaultValue={defaults?.value ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recordedAt">When</Label>
        <Input
          id="recordedAt"
          name="recordedAt"
          type="datetime-local"
          defaultValue={defaultLocalIso}
          required
        />
        <p className="text-xs text-muted-foreground">
          {isEdit
            ? "You can shift this to back-fill the correct time."
            : "Defaults to right now. Change it if you’re back-filling."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          maxLength={280}
          placeholder="Anything worth remembering?"
          defaultValue={defaults?.note ?? ""}
        />
      </div>

      {isEdit && defaults?.existingPhotoUrl ? (
        <div className="space-y-2">
          <Label>Photo</Label>
          <div className="flex items-start gap-3">
            {defaults.signedPhotoUrl && (
              <Image
                src={defaults.signedPhotoUrl}
                alt="Current photo"
                width={72}
                height={72}
                className="h-18 w-18 rounded-md object-cover"
                unoptimized
              />
            )}
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="photoAction_ui"
                  checked={photoAction === "keep"}
                  onChange={() => setPhotoAction("keep")}
                />
                Keep current photo
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="photoAction_ui"
                  checked={photoAction === "replace"}
                  onChange={() => setPhotoAction("replace")}
                />
                Replace with a new one
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="photoAction_ui"
                  checked={photoAction === "remove"}
                  onChange={() => setPhotoAction("remove")}
                />
                Remove
              </label>
            </div>
          </div>
          {photoAction === "replace" && (
            <Input
              ref={fileInputRef}
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              required
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="photo">Photo (optional)</Label>
          <Input
            ref={fileInputRef}
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => {
              if (!isEdit) return;
              // Edit mode + no existing photo: only treat this as an upload
              // when the user actually picked a file. Clearing the picker
              // reverts to "keep" so we don't reject the form for missing
              // a file that was never wanted.
              setPhotoAction(e.target.files?.[0] ? "replace" : "keep");
            }}
          />
          <p className="text-xs text-muted-foreground">
            Resized in your browser before upload (longest side ≤ 1600 px, EXIF
            stripped).
          </p>
        </div>
      )}

      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || resizing} className="flex-1">
          {resizing ? "Resizing photo…" : pending ? "Saving…" : effectiveSubmitLabel}
        </Button>
        {cancelHref && (
          <Button asChild type="button" variant="ghost">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

/** "Now" in the viewer's local timezone, formatted for `<input type="datetime-local">`. */
function nowLocalIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/** Convert an ISO/Date string to the local-naive form `datetime-local` expects. */
function formatToLocalIsoInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowLocalIso();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
