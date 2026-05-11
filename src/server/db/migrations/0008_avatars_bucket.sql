-- Avatars bucket (PUBLIC) with insert/update/delete-own policies.
-- Public so we can serve the URL directly without signing (profiles are
-- already mutually visible to the two of us, so there's nothing to hide).
-- Path convention: <profile_id>/avatar-<random>.<ext>
-- The leading folder enforces ownership via storage.foldername(name)[1].

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
--> statement-breakpoint

-- Reading is implicit on a public bucket; we only gate writes.

drop policy if exists "avatars insert own" on storage.objects;
--> statement-breakpoint
create policy "avatars insert own" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]::uuid = auth.uid()
  );
--> statement-breakpoint

drop policy if exists "avatars update own" on storage.objects;
--> statement-breakpoint
create policy "avatars update own" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]::uuid = auth.uid()
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]::uuid = auth.uid()
  );
--> statement-breakpoint

drop policy if exists "avatars delete own" on storage.objects;
--> statement-breakpoint
create policy "avatars delete own" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]::uuid = auth.uid()
  );
