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

import { deleteChallenge, type ActionResult } from "../actions";

/**
 * Typed-confirm delete. User must type the challenge title exactly before the
 * Delete button enables. Same pattern GitHub uses for repo deletion — friction
 * scaled to the irreversibility.
 */
export function DeleteChallengeDialog({
  challengeId,
  challengeTitle,
}: {
  challengeId: string;
  challengeTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action] = useActionState<ActionResult | null, FormData>(
    deleteChallenge,
    null,
  );
  const [pending, startTransition] = useTransition();

  const matches = typed.trim() === challengeTitle.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTyped("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" type="button">
          Delete challenge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this challenge?</DialogTitle>
          <DialogDescription>
            This wipes the challenge plus every stat entry and milestone
            attached to it. It can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) => {
            fd.set("challengeId", challengeId);
            startTransition(() => action(fd));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="confirm-title">
              Type{" "}
              <span className="font-mono font-semibold">
                {challengeTitle}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-title"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {state?.ok === false && (
            <p className="text-sm text-destructive">{state.error}</p>
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
              variant="destructive"
              disabled={!matches || pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
