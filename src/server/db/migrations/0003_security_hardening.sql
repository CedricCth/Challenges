-- ===========================================================================
-- Address Supabase advisor (database linter) warnings:
--   * SECURITY DEFINER helpers in `public` are auto-exposed via PostgREST
--     (/rest/v1/rpc/...). Move them to a non-exposed `private` schema so
--     `anon` and `authenticated` can't probe them over the REST API.
--   * Pin search_path on every plpgsql function for predictability.
-- RLS evaluation continues to work because RLS policies reference helpers
-- by fully-qualified name and we grant EXECUTE to `authenticated`.
-- ===========================================================================

create schema if not exists private;
--> statement-breakpoint

-- Lock down schema: only `authenticated` may USE it; PostgREST won't expose it.
revoke all on schema private from public;
--> statement-breakpoint
revoke all on schema private from anon;
--> statement-breakpoint
grant usage on schema private to authenticated;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Move helpers: public.is_participant -> private.is_participant
-- ---------------------------------------------------------------------------

create or replace function private.is_participant(p_challenge uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge
      and profile_id = auth.uid()
  );
$$;
--> statement-breakpoint
grant execute on function private.is_participant(uuid) to authenticated;
--> statement-breakpoint

create or replace function private.shares_challenge_with(p_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.challenge_participants a
    join public.challenge_participants b on a.challenge_id = b.challenge_id
    where a.profile_id = auth.uid()
      and b.profile_id = p_profile
  );
$$;
--> statement-breakpoint
grant execute on function private.shares_challenge_with(uuid) to authenticated;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Recreate every RLS policy that referenced the old public helpers to point
-- at the private equivalents. (Drop is idempotent; create then re-asserts.)
-- ---------------------------------------------------------------------------

-- profiles
drop policy if exists "profiles read self or shared" on public.profiles;
--> statement-breakpoint
create policy "profiles read self or shared" on public.profiles for select
  using (id = auth.uid() or private.shares_challenge_with(id));
--> statement-breakpoint

-- challenges
drop policy if exists "challenges read" on public.challenges;
--> statement-breakpoint
create policy "challenges read" on public.challenges for select
  using (created_by = auth.uid() or private.is_participant(id));
--> statement-breakpoint

drop policy if exists "challenges update" on public.challenges;
--> statement-breakpoint
create policy "challenges update" on public.challenges for update
  using (created_by = auth.uid() or private.is_participant(id))
  with check (created_by = auth.uid() or private.is_participant(id));
--> statement-breakpoint

-- challenge_participants
drop policy if exists "participants read" on public.challenge_participants;
--> statement-breakpoint
create policy "participants read" on public.challenge_participants for select
  using (private.is_participant(challenge_id));
--> statement-breakpoint

-- stat_entries
drop policy if exists "stats read" on public.stat_entries;
--> statement-breakpoint
create policy "stats read" on public.stat_entries for select
  using (private.is_participant(challenge_id));
--> statement-breakpoint

drop policy if exists "stats insert own" on public.stat_entries;
--> statement-breakpoint
create policy "stats insert own" on public.stat_entries for insert
  with check (profile_id = auth.uid() and private.is_participant(challenge_id));
--> statement-breakpoint

-- milestones
drop policy if exists "milestones read" on public.milestones;
--> statement-breakpoint
create policy "milestones read" on public.milestones for select
  using (private.is_participant(challenge_id));
--> statement-breakpoint

drop policy if exists "milestones write" on public.milestones;
--> statement-breakpoint
create policy "milestones write" on public.milestones for all
  using (private.is_participant(challenge_id))
  with check (private.is_participant(challenge_id));
--> statement-breakpoint

-- storage policies (stat-photos bucket)
drop policy if exists "stat photos read" on storage.objects;
--> statement-breakpoint
create policy "stat photos read" on storage.objects for select
  using (
    bucket_id = 'stat-photos'
    and private.is_participant((storage.foldername(name))[1]::uuid)
  );
--> statement-breakpoint

drop policy if exists "stat photos insert own" on storage.objects;
--> statement-breakpoint
create policy "stat photos insert own" on storage.objects for insert
  with check (
    bucket_id = 'stat-photos'
    and (storage.foldername(name))[2]::uuid = auth.uid()
    and private.is_participant((storage.foldername(name))[1]::uuid)
  );
--> statement-breakpoint

-- Now the public helpers have no remaining references — drop them.
drop function if exists public.is_participant(uuid);
--> statement-breakpoint
drop function if exists public.shares_challenge_with(uuid);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Move handle_new_user (trigger function) to private schema and re-point
-- the trigger. The trigger fires on inserts to auth.users; it's never
-- callable from REST, but the lint still flags it.
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
--> statement-breakpoint

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'display_name' = 'Cedi' then '#2563EB'
      when new.raw_user_meta_data->>'display_name' = 'Stefi' then '#C084FC'
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
--> statement-breakpoint

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
--> statement-breakpoint

drop function if exists public.handle_new_user();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Pin search_path on the remaining plpgsql function (set_updated_at) to
-- silence the function_search_path_mutable warning.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
