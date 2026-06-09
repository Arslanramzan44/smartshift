-- ============================================================
-- SmartShift — Supabase schema
-- Run this whole file in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- IMPORTANT (do this in the dashboard, not SQL):
--   Authentication > Sign In / Providers > Email
--   -> turn OFF "Confirm email"
-- So signUp returns a session immediately (no email-confirmation flow).

-- ------------------------------------------------------------
-- 1. profiles table
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  role                   text not null check (role in ('customer', 'mover')),
  full_name              text,
  email                  text,
  phone                  text,
  avatar_url             text,
  -- mover-only documents (paths in the private mover-docs bucket)
  driving_license_url    text,
  cnic_front_url         text,
  cnic_back_url          text,
  police_clearance_url   text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Row Level Security — each user sees/edits only their row
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------
-- 3. Storage buckets
--    avatars   -> public  (profile pictures)
--    mover-docs-> private (license, cnic, police clearance)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('mover-docs', 'mover-docs', false)
  on conflict (id) do nothing;

-- Files are stored under a folder named after the user id: "<uid>/<file>".
-- Policies below let a user manage only their own folder.

-- avatars (public read, owner write)
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- mover-docs (owner read + write only)
drop policy if exists "moverdocs_read_own" on storage.objects;
create policy "moverdocs_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'mover-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moverdocs_write_own" on storage.objects;
create policy "moverdocs_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mover-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moverdocs_update_own" on storage.objects;
create policy "moverdocs_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'mover-docs' and (storage.foldername(name))[1] = auth.uid()::text);
