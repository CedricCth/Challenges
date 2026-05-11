"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { markAllNotificationsRead } from "../actions";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
    >
      {pending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
