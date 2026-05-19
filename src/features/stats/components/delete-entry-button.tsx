"use client";

import { useState, useTransition } from "react";

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

import { deleteStatEntry } from "../actions";

/**
 * Inline "Delete" trigger rendered next to "Edit" on owned rows. Opens a
 * shadcn Dialog for confirmation (matches the visual language of
 * DeclareWinnerDialog) instead of the browser-native confirm(). The
 * server action's `revalidatePath` re-renders the parent RSC, so we don't
 * manage local list state.
 */
export function DeleteEntryButton({
  challengeId,
  entryId,
}: {
  challengeId: string;
  entryId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    const fd = new FormData();
    fd.set("challengeId", challengeId);
    fd.set("entryId", entryId);
    startTransition(async () => {
      const result = await deleteStatEntry(null, fd);
      if (result && !result.ok) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline hover:text-destructive"
          aria-label="Delete entry"
        >
          Delete
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this entry?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone. The entry, its note and any photo will
            be removed.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
