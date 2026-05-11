-- RLS for the notifications queue (producer-consumer pattern).
--   * SELECT: a recipient can read their own rows (and only their own).
--   * UPDATE: a recipient can mark their own rows read.
--   * INSERT/DELETE: producers run as the trusted server connection (postgres
--     superuser via the pooler, which bypasses RLS). We deliberately do NOT
--     grant insert via REST so no end-user can forge notifications.

alter table public.notifications enable row level security;
--> statement-breakpoint

create policy "notifications read own" on public.notifications for select
  using (recipient_id = auth.uid());
--> statement-breakpoint

create policy "notifications mark own read" on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
