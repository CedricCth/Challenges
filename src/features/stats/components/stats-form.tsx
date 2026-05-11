"use client";

import { useActionState, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resizeImage } from "@/lib/image-resize";

import { addStatEntry, type ActionResult } from "../actions";

interface MetricOption {
  metric: string;
  label: string;
  unit: string;
}

export function StatsForm({
  challengeId,
  metrics,
  defaultMetric,
}: {
  challengeId: string;
  metrics: MetricOption[];
  defaultMetric?: string;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    addStatEntry,
    null,
  );
  const [pending, startTransition] = useTransition();
  const [metric, setMetric] = useState(defaultMetric ?? metrics[0]?.metric ?? "");
  const [resizing, setResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Pre-fill the picker with "now" in the viewer's local TZ. <input
  // type="datetime-local"> wants the format YYYY-MM-DDTHH:mm.
  const nowLocalIso = (() => {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  })();

  const currentUnit = metrics.find((m) => m.metric === metric)?.unit ?? "";

  async function handleSubmit(formData: FormData) {
    const file = formData.get("photo");
    if (file instanceof File && file.size > 0) {
      setResizing(true);
      try {
        const { file: resized } = await resizeImage(file);
        formData.set("photo", resized);
      } catch {
        // Fall through with the original file; server still validates.
      } finally {
        setResizing(false);
      }
    } else {
      // Empty file picker — drop the empty File so the server skips upload.
      formData.delete("photo");
    }

    // datetime-local sends "YYYY-MM-DDTHH:mm" with no timezone info. The
    // server's `new Date(...)` would interpret that as UTC and reject the
    // picked-in-CEST "now" as 2h in the future. Convert to a full ISO
    // string (with TZ offset embedded) before submitting so the server
    // parses it as the same instant the user actually picked.
    const recordedAtRaw = formData.get("recordedAt");
    if (typeof recordedAtRaw === "string" && recordedAtRaw.length > 0) {
      const localDate = new Date(recordedAtRaw); // browser interprets as local
      if (!Number.isNaN(localDate.getTime())) {
        formData.set("recordedAt", localDate.toISOString());
      }
    }

    startTransition(() => action(formData));
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <input type="hidden" name="challengeId" value={challengeId} />

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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recordedAt">When</Label>
        <Input
          id="recordedAt"
          name="recordedAt"
          type="datetime-local"
          defaultValue={nowLocalIso}
          required
        />
        <p className="text-xs text-muted-foreground">
          Defaults to right now. Change it if you&apos;re back-filling.
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">Photo (optional)</Label>
        <Input
          ref={fileInputRef}
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
        />
        <p className="text-xs text-muted-foreground">
          Resized in your browser before upload (longest side ≤ 1600 px, EXIF
          stripped).
        </p>
      </div>

      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending || resizing} className="w-full">
        {resizing ? "Resizing photo…" : pending ? "Saving…" : "Add entry"}
      </Button>
    </form>
  );
}
