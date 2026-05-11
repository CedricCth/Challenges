"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/domain/entities";
import { resizeImage } from "@/lib/image-resize";

import { declareWinner, type ActionResult } from "../actions";

const CONFIRM_PHRASE = "declare";

export function DeclareWinnerDialog({
  challengeId,
  participants,
}: {
  challengeId: string;
  participants: Profile[];
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<"winner" | "tie">("winner");
  const [winnerId, setWinnerId] = useState<string>(
    participants[0]?.id ?? "",
  );
  const [confirmText, setConfirmText] = useState("");
  const [resizing, setResizing] = useState(false);
  const [state, action] = useActionState<ActionResult | null, FormData>(
    declareWinner,
    null,
  );
  const [pending, startTransition] = useTransition();

  const matchesConfirm =
    confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  async function handleSubmit(formData: FormData) {
    formData.set("challengeId", challengeId);
    formData.set("outcome", outcome);
    if (outcome === "winner") formData.set("winnerId", winnerId);

    const file = formData.get("photo");
    if (file instanceof File && file.size > 0) {
      setResizing(true);
      try {
        const { file: resized } = await resizeImage(file);
        formData.set("photo", resized);
      } catch {
        // Server still validates; fall through with the original file.
      } finally {
        setResizing(false);
      }
    } else {
      formData.delete("photo");
    }
    startTransition(() => action(formData));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button>Declare winner</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Declare the winner</DialogTitle>
          <DialogDescription>
            This marks the challenge completed. It can&apos;t be undone from
            the UI — to change the outcome later you&apos;d have to edit the
            row in Supabase.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <input
                type="radio"
                name="outcome"
                value="winner"
                checked={outcome === "winner"}
                onChange={() => setOutcome("winner")}
                className="h-4 w-4"
              />
              <span>Someone won</span>
            </label>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <input
                type="radio"
                name="outcome"
                value="tie"
                checked={outcome === "tie"}
                onChange={() => setOutcome("tie")}
                className="h-4 w-4"
              />
              <span>It&apos;s a tie</span>
            </label>
          </div>
          {outcome === "winner" && (
            <div className="space-y-2">
              <Label htmlFor="winnerId">Who won?</Label>
              <select
                id="winnerId"
                value={winnerId}
                onChange={(e) => setWinnerId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                required
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="winner-note">Note (optional)</Label>
            <Textarea
              id="winner-note"
              name="note"
              rows={3}
              maxLength={1000}
              placeholder="How did it go down? Anything worth remembering?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="winner-photo">Victory photo (optional)</Label>
            <Input
              id="winner-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
            />
            <p className="text-xs text-muted-foreground">
              Resized in your browser before upload (longest side ≤ 1600 px,
              EXIF stripped).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-phrase">
              Type{" "}
              <span className="font-mono font-semibold">
                {CONFIRM_PHRASE}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-phrase"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {state?.ok === false && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.ok && (
            <p className="text-sm text-muted-foreground">
              Saved. You can close this.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!matchesConfirm || pending || resizing}
            >
              {resizing
                ? "Resizing photo…"
                : pending
                  ? "Saving…"
                  : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
