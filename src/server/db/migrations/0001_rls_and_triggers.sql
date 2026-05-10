-- ===========================================================================
-- Helper functions, triggers, RLS policies, storage bucket + policies, and a
-- backfill for the two profiles seeded before this migration ran.
--
-- Mirrors docs/04-DATABASE-SCHEMA.md verbatim. ADR-004 (defence in depth):
-- the database is the third gate after middleware + page-level getUser().
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (security definer to bypass their own table's RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_participant(p_challenge uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge
      and profile_id = auth.uid()
  );
$$;
--> statement-breakpoint

create or replace function public.shares_challenge_with(p_profile uuid)
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

-- ---------------------------------------------------------------------------
-- updated_at trigger for challenges
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
--> statement-breakpoint

drop trigger if exists challenges_set_updated_at on public.challenges;
--> statement-breakpoint
create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute function public.set_updated_at();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Auto-create profile when an auth.users row is inserted.
-- Pulls display_name from raw_user_meta_data (set in Supabase Studio); falls
-- back to the local-part of the email. Seeds Cedi/Stefi colours by name.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
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

drop trigger if exists on_auth_user_created on auth.users;
--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill profiles for users that already exist in auth.users.
-- (Cedi + Stefi were created via Supabase Studio before this migration ran.)
-- ---------------------------------------------------------------------------

insert into public.profiles (id, display_name, color)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  case
    when u.raw_user_meta_data->>'display_name' = 'Cedi' then '#2563EB'
    when u.raw_user_meta_data->>'display_name' = 'Stefi' then '#C084FC'
    else null
  end
from auth.users u
on conflict (id) do nothing;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- RLS — profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
--> statement-breakpoint
create policy "profiles read self or shared" on public.profiles for select
  using (id = auth.uid() or public.shares_challenge_with(id));
--> statement-breakpoint
create policy "profiles edit own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- RLS — challenge_types (lookup, readable to all authenticated users)
-- ---------------------------------------------------------------------------

alter table public.challenge_types enable row level security;
--> statement-breakpoint
create policy "types read" on public.challenge_types for select
  using (auth.uid() is not null);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- RLS — challenges
-- ---------------------------------------------------------------------------

alter table public.challenges enable row level security;
--> statement-breakpoint
create policy "challenges read" on public.challenges for select
  using (created_by = auth.uid() or public.is_participant(id));
--> statement-breakpoint
create policy "challenges insert" on public.challenges for insert
  with check (created_by = auth.uid());
--> statement-breakpoint
create policy "challenges update" on public.challenges for update
  using (created_by = auth.uid() or public.is_participant(id))
  with check (created_by = auth.uid() or public.is_participant(id));
--> statement-breakpoint
create policy "challenges delete" on public.challenges for delete
  using (created_by = auth.uid());
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- RLS — challenge_participants
-- (insert allows the creator to bootstrap participants; otherwise self only)
-- ---------------------------------------------------------------------------

alter table public.challenge_participants enable row level security;
--> statement-breakpoint
create policy "participants read" on public.challenge_participants for select
  using (public.is_participant(challenge_id));
--> statement-breakpoint
create policy "participants insert" on public.challenge_participants for insert
  with check (
    profile_id = auth.uid()
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  );
--> statement-breakpoint
create policy "participants delete own" on public.challenge_participants for delete
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())
  );
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- RLS — stat_entries
-- ---------------------------------------------------------------------------

alter table public.stat_entries enable row level security;
--> statement-breakpoint
create policy "stats read" on public.stat_entries for select
  using (public.is_participant(challenge_id));
--> statement-breakpoint
create policy "stats insert own" on public.stat_entries for insert
  with check (profile_id = auth.uid() and public.is_participant(challenge_id));
--> statement-breakpoint
create policy "stats update own" on public.stat_entries for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
--> statement-breakpoint
create policy "stats delete own" on public.stat_entries for delete
  using (profile_id = auth.uid());
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- RLS — milestones
-- ---------------------------------------------------------------------------

alter table public.milestones enable row level security;
--> statement-breakpoint
create policy "milestones read" on public.milestones for select
  using (public.is_participant(challenge_id));
--> statement-breakpoint
create policy "milestones write" on public.milestones for all
  using (public.is_participant(challenge_id))
  with check (public.is_participant(challenge_id));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Storage bucket: stat-photos (private) + RLS mirroring the table policies.
-- Path convention: stat-photos/<challenge_id>/<profile_id>/<file>.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('stat-photos','stat-photos', false)
on conflict (id) do nothing;
--> statement-breakpoint

drop policy if exists "stat photos read" on storage.objects;
--> statement-breakpoint
create policy "stat photos read" on storage.objects for select
  using (
    bucket_id = 'stat-photos'
    and public.is_participant((storage.foldername(name))[1]::uuid)
  );
--> statement-breakpoint

drop policy if exists "stat photos insert own" on storage.objects;
--> statement-breakpoint
create policy "stat photos insert own" on storage.objects for insert
  with check (
    bucket_id = 'stat-photos'
    and (storage.foldername(name))[2]::uuid = auth.uid()
    and public.is_participant((storage.foldername(name))[1]::uuid)
  );
--> statement-breakpoint

drop policy if exists "stat photos delete own" on storage.objects;
--> statement-breakpoint
create policy "stat photos delete own" on storage.objects for delete
  using (
    bucket_id = 'stat-photos'
    and (storage.foldername(name))[2]::uuid = auth.uid()
  );
