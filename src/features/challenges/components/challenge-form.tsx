"use client";

import { useActionState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Challenge, Profile } from "@/domain/entities";

import type { ActionResult } from "../actions";

interface MetricOption {
  metric: string;
  label: string;
  unit: string;
  direction: "higher" | "lower";
}

export interface ChallengeFormProps {
  mode: "create" | "edit";
  typeKey: string;
  typeLabel: string;
  metrics: MetricOption[];
  profiles: Profile[];
  currentUserId: string;
  initial?: Pick<
    Challenge,
    | "id"
    | "title"
    | "description"
    | "goalMetric"
    | "goalTarget"
    | "goalDirection"
    | "startDate"
    | "endDate"
  >;
  initialParticipantIds?: string[];
  action: (
    prev: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
}

export function ChallengeForm({
  mode,
  typeKey,
  typeLabel,
  metrics,
  profiles,
  currentUserId,
  initial,
  initialParticipantIds,
  action,
}: ChallengeFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [pending, startTransition] = useTransition();

  const defaultMetric = initial?.goalMetric ?? metrics[0]?.metric ?? "";
  const defaultDirection =
    initial?.goalDirection ??
    metrics.find((m) => m.metric === defaultMetric)?.direction ??
    "lower";
  const defaultParticipants =
    initialParticipantIds ??
    profiles.filter((p) => p.id !== currentUserId).map((p) => p.id);

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="space-y-6"
    >
      <input type="hidden" name="typeKey" value={typeKey} />
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Challenge type</p>
        <p className="text-sm font-medium">{typeLabel}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. Spring fitness contest"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder="What are we doing here?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goalMetric">Goal metric</Label>
          <select
            id="goalMetric"
            name="goalMetric"
            defaultValue={defaultMetric}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          <Label htmlFor="goalDirection">Direction</Label>
          <select
            id="goalDirection"
            name="goalDirection"
            defaultValue={defaultDirection}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          >
            <option value="lower">Lower is better</option>
            <option value="higher">Higher is better</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goalTarget">Goal target</Label>
        <Input
          id="goalTarget"
          name="goalTarget"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={initial?.goalTarget ?? ""}
          placeholder="e.g. 5"
        />
        <p className="text-xs text-muted-foreground">
          Total change to aim for over the challenge.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={initial?.startDate ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={initial?.endDate ?? ""}
          />
        </div>
      </div>

      {mode === "create" && profiles.length > 0 && (
        <div className="space-y-2">
          <Label>Participants</Label>
          <div className="space-y-2">
            {profiles.map((p) => {
              const isMe = p.id === currentUserId;
              const isDefault = defaultParticipants.includes(p.id) || isMe;
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="participantIds"
                    value={p.id}
                    defaultChecked={isDefault}
                    disabled={isMe}
                    className="h-4 w-4"
                  />
                  <span>
                    {p.displayName}
                    {isMe && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            You&apos;re always in. Tick anyone else who&apos;s playing.
          </p>
        </div>
      )}

      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create challenge"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
