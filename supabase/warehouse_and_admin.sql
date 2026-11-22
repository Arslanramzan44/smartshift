-- ============================================================
-- SmartShift — Complete Admin, Driver Verification, Live Tracking
-- & Full Warehouse System Schema Migration
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ------------------------------------------------------------
-- 0. Hardened helper functions & private admin check
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ------------------------------------------------------------
-- 1. Extend profiles table (roles, verification, telemetry, admin)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_banned boolean not null default false,
  add column if not exists driver_lat double precision,
  add column if not exists driver_lng double precision,
  add column if not exists vehicle_type text,
  add column if not exists vehicle_plate text,
  add column if not exists is_online boolean not null default false,
  add column if not exists last_active_at timestamptz default now();

-- Allow customer, mover, warehouse, and admin roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'mover', 'warehouse', 'admin'));

-- Verification status check constraint (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_verification_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_verification_status_check
      check (verification_status in ('pending', 'approved', 'rejected', 'suspended'));
  end if;
end $$;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_verification_status_idx on public.profiles (verification_status);

-- Approve existing customers by default
update public.profiles
set verification_status = 'approved'
where role = 'customer' and (verification_status is null or verification_status = 'pending');

-- Ensure admin@smartshift.pk has admin app_metadata & profile row
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true, "role": "admin"}'::jsonb
where email = 'admin@smartshift.pk';

insert into public.profiles (id, role, full_name, email, is_admin, verification_status, verified_at)
select
  u.id,
  'admin',
  'SmartShift Administrator',
  u.email,
  true,
  'approved',
  now()
from auth.users u
where u.email = 'admin@smartshift.pk'
on conflict (id) do update
set
  role = 'admin',
  is_admin = true,
  verification_status = 'approved',
  verified_at = coalesce(public.profiles.verified_at, now());

-- Recover mover profile for sharozmayo7234@gmail.com whose signup uploaded docs before verification_status existed
insert into public.profiles (
  id, role, full_name, email, avatar_url,
  driving_license_url, cnic_front_url, cnic_back_url, police_clearance_url,
  verification_status, vehicle_type, vehicle_plate
)
select
  u.id,
  'mover',
  'Sharoz Mayo',
  u.email,
  'https://nctjfcdsxdeqfruezcub.supabase.co/storage/v1/object/public/avatars/4c7afa5f-6392-4eca-b4e5-c7ea1a6fec34/avatar-1794429476781.jpg',
  '4c7afa5f-6392-4eca-b4e5-c7ea1a6fec34/license-1794429477441.jpg',
  '4c7afa5f-6392-4eca-b4e5-c7ea1a6fec34/cnic-front-1794429477987.png',
  '4c7afa5f-6392-4eca-b4e5-c7ea1a6fec34/cnic-back-1794429479392.png',
  '4c7afa5f-6392-4eca-b4e5-c7ea1a6fec34/police-1794429480035.jpeg',
  'pending',
  'Mini Truck',
  'LEA-7234'
from auth.users u
where u.id = '4c7afa5f-6392-4eca-b4e5-c7ea1a6fec34'
on conflict (id) do nothing;

-- Private SECURITY DEFINER admin check (never exposes bypass to non-admins)
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean, false)
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and (p.is_admin = true or p.role = 'admin')
    );
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 2. Warehouses table (Warehouse Partner Facilities)
-- ------------------------------------------------------------
create table if not exists public.warehouses (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid not null references auth.users (id) on delete cascade,
  name                   text not null,
  description            text,
  city                   text not null default 'Lahore',
  address                text not null,
  lat                    double precision,
  lng                    double precision,
  contact_phone          text,
  contact_email          text,
  image_url              text,
  -- Capacity & units
  total_capacity_sqm     numeric not null default 500 check (total_capacity_sqm > 0),
  occupied_capacity_sqm  numeric not null default 0 check (occupied_capacity_sqm >= 0),
  small_units_total      int not null default 10 check (small_units_total >= 0),
  small_units_available  int not null default 10 check (small_units_available >= 0),
  medium_units_total     int not null default 8 check (medium_units_total >= 0),
  medium_units_available int not null default 8 check (medium_units_available >= 0),
  large_units_total      int not null default 5 check (large_units_total >= 0),
  large_units_available  int not null default 5 check (large_units_available >= 0),
  -- Daily rates (PKR)
  small_rate_daily       numeric not null default 200 check (small_rate_daily >= 0),
  medium_rate_daily      numeric not null default 450 check (medium_rate_daily >= 0),
  large_rate_daily       numeric not null default 900 check (large_rate_daily >= 0),
  -- Security & live facility telemetry
  climate_controlled     boolean not null default true,
  cctv_enabled           boolean not null default true,
  insured                boolean not null default true,
  security_24_7          boolean not null default true,
  temperature_c          numeric default 21.5,
  humidity_pct           numeric default 45,
  operational_status     text not null default 'open'
                           check (operational_status in ('open', 'busy', 'maintenance', 'closed')),
  -- Compliance documents (paths in private warehouse-docs bucket)
  business_license_url   text,
  property_ownership_url text,
  fire_safety_cert_url   text,
  owner_cnic_front_url   text,
  owner_cnic_back_url    text,
  -- Admin verification
  verification_status    text not null default 'pending'
                           check (verification_status in ('pending', 'approved', 'rejected', 'suspended')),
  verification_notes     text,
  verified_at            timestamptz,
  rating                 numeric default 4.9,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists warehouses_owner_idx on public.warehouses (owner_id);
create index if not exists warehouses_status_idx on public.warehouses (verification_status);
create index if not exists warehouses_city_idx on public.warehouses (city);

drop trigger if exists warehouses_set_updated_at on public.warehouses;
create trigger warehouses_set_updated_at
  before update on public.warehouses
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.warehouses to authenticated;

-- ------------------------------------------------------------
-- 3. Extend bookings table (live driver GPS & warehouse link)
-- ------------------------------------------------------------
alter table public.bookings
  add column if not exists mover_name text,
  add column if not exists mover_phone text,
  add column if not exists driver_lat double precision,
  add column if not exists driver_lng double precision,
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists dropoff_lat double precision,
  add column if not exists dropoff_lng double precision,
  add column if not exists driver_speed_kmh numeric,
  add column if not exists driver_heading numeric,
  add column if not exists last_location_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists warehouse_id uuid references public.warehouses (id) on delete set null;

create index if not exists bookings_warehouse_idx on public.bookings (warehouse_id);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

-- ------------------------------------------------------------
-- 4. Extend storage_bookings table (full warehouse workflow)
-- ------------------------------------------------------------
alter table public.storage_bookings
  add column if not exists warehouse_id uuid references public.warehouses (id) on delete set null,
  add column if not exists warehouse_owner_id uuid references auth.users (id) on delete set null,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists unit_code text,
  add column if not exists end_date date,
  add column if not exists payment_method text not null default 'cod',
  add column if not exists items_summary text,
  add column if not exists items_count int not null default 1,
  add column if not exists qr_code text,
  add column if not exists tracking_stage text not null default 'reserved',
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'storage_bookings_payment_method_check'
      and conrelid = 'public.storage_bookings'::regclass
  ) then
    alter table public.storage_bookings
      add constraint storage_bookings_payment_method_check
      check (payment_method in ('cod', 'card'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'storage_bookings_tracking_stage_check'
      and conrelid = 'public.storage_bookings'::regclass
  ) then
    alter table public.storage_bookings
      add constraint storage_bookings_tracking_stage_check
      check (tracking_stage in ('reserved', 'confirmed', 'checked_in', 'in_storage', 'release_requested', 'checked_out', 'cancelled'));
  end if;
end $$;

create index if not exists storage_bookings_warehouse_idx on public.storage_bookings (warehouse_id);
create index if not exists storage_bookings_owner_idx on public.storage_bookings (warehouse_owner_id);
create index if not exists storage_bookings_stage_idx on public.storage_bookings (tracking_stage);
create index if not exists storage_bookings_created_idx on public.storage_bookings (created_at desc);

drop trigger if exists storage_bookings_set_updated_at on public.storage_bookings;
create trigger storage_bookings_set_updated_at
  before update on public.storage_bookings
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.storage_bookings to authenticated;

-- ------------------------------------------------------------
-- 5. Warehouse Tracking Logs (Live Audit & Condition Timeline)
-- ------------------------------------------------------------
create table if not exists public.warehouse_tracking_logs (
  id                  uuid primary key default gen_random_uuid(),
  storage_booking_id  uuid not null references public.storage_bookings (id) on delete cascade,
  warehouse_id        uuid references public.warehouses (id) on delete set null,
  actor_id            uuid references auth.users (id) on delete set null,
  actor_role          text,
  event_type          text not null,
  title               text not null,
  details             text,
  location_bay        text,
  temperature_c       numeric,
  humidity_pct        numeric,
  created_at          timestamptz not null default now()
);

create index if not exists wh_logs_booking_idx on public.warehouse_tracking_logs (storage_booking_id);
create index if not exists wh_logs_warehouse_idx on public.warehouse_tracking_logs (warehouse_id);
create index if not exists wh_logs_actor_idx on public.warehouse_tracking_logs (actor_id);
create index if not exists wh_logs_created_idx on public.warehouse_tracking_logs (created_at desc);

grant select, insert, update, delete on public.warehouse_tracking_logs to authenticated;

-- ------------------------------------------------------------
-- 6. Storage Buckets & Policies
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('warehouse-docs', 'warehouse-docs', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('warehouse-photos', 'warehouse-photos', true)
  on conflict (id) do nothing;

-- mover-docs: admin can inspect all uploaded mover documents
drop policy if exists "moverdocs_read_admin_or_all" on storage.objects;
drop policy if exists "moverdocs_read_admin" on storage.objects;
create policy "moverdocs_read_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'mover-docs' and (select private.is_admin()));

-- warehouse-docs: owner manages own folder; admin can inspect all
drop policy if exists "warehousedocs_read_own_or_admin" on storage.objects;
create policy "warehousedocs_read_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'warehouse-docs'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

drop policy if exists "warehousedocs_write_own" on storage.objects;
create policy "warehousedocs_write_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'warehouse-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "warehousedocs_update_own" on storage.objects;
create policy "warehousedocs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'warehouse-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- warehouse-photos: public read, owner write/update
drop policy if exists "warehousephotos_read" on storage.objects;
create policy "warehousephotos_read" on storage.objects
  for select
  using (bucket_id = 'warehouse-photos');

drop policy if exists "warehousephotos_write_own" on storage.objects;
create policy "warehousephotos_write_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'warehouse-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "warehousephotos_update_own" on storage.objects;
create policy "warehousephotos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'warehouse-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ------------------------------------------------------------
-- 7. Clean, Fast, Secure Row-Level Security Policies
-- ------------------------------------------------------------

-- 7a. profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_movers" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "admin_manage_profiles" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_delete_policy" on public.profiles;

create policy "profiles_select_policy" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or role in ('mover', 'warehouse')
    or (select private.is_admin())
  );

create policy "profiles_insert_policy" on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "profiles_update_policy" on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_admin())
  )
  with check (
    id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "profiles_delete_policy" on public.profiles
  for delete to authenticated
  using ((select private.is_admin()));

-- 7b. bookings
alter table public.bookings enable row level security;

drop policy if exists "bookings_select" on public.bookings;
drop policy if exists "bookings_insert_own" on public.bookings;
drop policy if exists "bookings_update_customer" on public.bookings;
drop policy if exists "bookings_update_mover" on public.bookings;
drop policy if exists "admin_manage_bookings" on public.bookings;
drop policy if exists "bookings_select_policy" on public.bookings;
drop policy if exists "bookings_insert_policy" on public.bookings;
drop policy if exists "bookings_update_policy" on public.bookings;
drop policy if exists "bookings_delete_policy" on public.bookings;

create policy "bookings_select_policy" on public.bookings
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or mover_id = (select auth.uid())
    or (status = 'pending' and mover_id is null)
    or (select private.is_admin())
  );

create policy "bookings_insert_policy" on public.bookings
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "bookings_update_policy" on public.bookings
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or mover_id = (select auth.uid())
    or (status = 'pending' and mover_id is null)
    or (select private.is_admin())
  )
  with check (
    customer_id = (select auth.uid())
    or mover_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "bookings_delete_policy" on public.bookings
  for delete to authenticated
  using ((select private.is_admin()));

-- 7c. booking_items
alter table public.booking_items enable row level security;

drop policy if exists "booking_items_select" on public.booking_items;
drop policy if exists "booking_items_insert" on public.booking_items;
drop policy if exists "booking_items_update_mover" on public.booking_items;
drop policy if exists "admin_manage_booking_items" on public.booking_items;
drop policy if exists "booking_items_select_policy" on public.booking_items;
drop policy if exists "booking_items_insert_policy" on public.booking_items;
drop policy if exists "booking_items_update_policy" on public.booking_items;
drop policy if exists "booking_items_delete_policy" on public.booking_items;

create policy "booking_items_select_policy" on public.booking_items
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id
        and (
          b.customer_id = (select auth.uid())
          or b.mover_id = (select auth.uid())
          or (b.status = 'pending' and b.mover_id is null)
        )
    )
  );

create policy "booking_items_insert_policy" on public.booking_items
  for insert to authenticated
  with check (
    (select private.is_admin())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id
        and b.customer_id = (select auth.uid())
    )
  );

create policy "booking_items_update_policy" on public.booking_items
  for update to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id
        and b.mover_id = (select auth.uid())
    )
  )
  with check (
    (select private.is_admin())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id
        and b.mover_id = (select auth.uid())
    )
  );

create policy "booking_items_delete_policy" on public.booking_items
  for delete to authenticated
  using ((select private.is_admin()));

-- 7d. reviews
alter table public.reviews enable row level security;

drop policy if exists "reviews_select" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_select_policy" on public.reviews;
drop policy if exists "reviews_insert_policy" on public.reviews;

create policy "reviews_select_policy" on public.reviews
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or mover_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "reviews_insert_policy" on public.reviews
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.customer_id = (select auth.uid())
        and b.status = 'delivered'
    )
  );

-- 7e. warehouses
alter table public.warehouses enable row level security;

drop policy if exists "warehouses_select_policy" on public.warehouses;
drop policy if exists "warehouses_insert_policy" on public.warehouses;
drop policy if exists "warehouses_update_policy" on public.warehouses;
drop policy if exists "warehouses_delete_policy" on public.warehouses;

create policy "warehouses_select_policy" on public.warehouses
  for select to authenticated
  using (
    verification_status = 'approved'
    or owner_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "warehouses_insert_policy" on public.warehouses
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "warehouses_update_policy" on public.warehouses
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select private.is_admin())
  )
  with check (
    owner_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "warehouses_delete_policy" on public.warehouses
  for delete to authenticated
  using ((select private.is_admin()));

-- 7f. storage_bookings
alter table public.storage_bookings enable row level security;

drop policy if exists "storage_bookings_own" on public.storage_bookings;
drop policy if exists "storage_bookings_select_policy" on public.storage_bookings;
drop policy if exists "storage_bookings_insert_policy" on public.storage_bookings;
drop policy if exists "storage_bookings_update_policy" on public.storage_bookings;
drop policy if exists "storage_bookings_delete_policy" on public.storage_bookings;

create policy "storage_bookings_select_policy" on public.storage_bookings
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or warehouse_owner_id = (select auth.uid())
    or exists (
      select 1 from public.warehouses w
      where w.id = storage_bookings.warehouse_id
        and w.owner_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

create policy "storage_bookings_insert_policy" on public.storage_bookings
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "storage_bookings_update_policy" on public.storage_bookings
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or warehouse_owner_id = (select auth.uid())
    or exists (
      select 1 from public.warehouses w
      where w.id = storage_bookings.warehouse_id
        and w.owner_id = (select auth.uid())
    )
    or (select private.is_admin())
  )
  with check (
    customer_id = (select auth.uid())
    or warehouse_owner_id = (select auth.uid())
    or exists (
      select 1 from public.warehouses w
      where w.id = storage_bookings.warehouse_id
        and w.owner_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

create policy "storage_bookings_delete_policy" on public.storage_bookings
  for delete to authenticated
  using ((select private.is_admin()));

-- 7g. warehouse_tracking_logs
alter table public.warehouse_tracking_logs enable row level security;

drop policy if exists "wh_logs_select_policy" on public.warehouse_tracking_logs;
drop policy if exists "wh_logs_insert_policy" on public.warehouse_tracking_logs;
drop policy if exists "wh_logs_update_policy" on public.warehouse_tracking_logs;
drop policy if exists "wh_logs_delete_policy" on public.warehouse_tracking_logs;

create policy "wh_logs_select_policy" on public.warehouse_tracking_logs
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.storage_bookings sb
      where sb.id = warehouse_tracking_logs.storage_booking_id
        and (
          sb.customer_id = (select auth.uid())
          or sb.warehouse_owner_id = (select auth.uid())
          or exists (
            select 1 from public.warehouses w
            where w.id = sb.warehouse_id
              and w.owner_id = (select auth.uid())
          )
        )
    )
  );

create policy "wh_logs_insert_policy" on public.warehouse_tracking_logs
  for insert to authenticated
  with check (
    (select private.is_admin())
    or exists (
      select 1 from public.storage_bookings sb
      where sb.id = warehouse_tracking_logs.storage_booking_id
        and (
          sb.customer_id = (select auth.uid())
          or sb.warehouse_owner_id = (select auth.uid())
          or exists (
            select 1 from public.warehouses w
            where w.id = sb.warehouse_id
              and w.owner_id = (select auth.uid())
          )
        )
    )
  );

create policy "wh_logs_update_policy" on public.warehouse_tracking_logs
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "wh_logs_delete_policy" on public.warehouse_tracking_logs
  for delete to authenticated
  using ((select private.is_admin()));

-- ------------------------------------------------------------
-- 8. Privilege-escalation guard triggers (non-admins cannot self-approve)
-- ------------------------------------------------------------
create or replace function private.guard_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.role := old.role;
    if new.verification_status is distinct from old.verification_status then
      -- Only allow rejected -> pending when re-submitting documents
      if not (old.verification_status = 'rejected' and new.verification_status = 'pending') then
        new.verification_status := old.verification_status;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_escalation on public.profiles;
create trigger profiles_guard_escalation
  before update on public.profiles
  for each row execute function private.guard_profile_escalation();

create or replace function private.guard_warehouse_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    new.owner_id := old.owner_id;
    if new.verification_status is distinct from old.verification_status then
      if not (old.verification_status = 'rejected' and new.verification_status = 'pending') then
        new.verification_status := old.verification_status;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists warehouses_guard_escalation on public.warehouses;
create trigger warehouses_guard_escalation
  before update on public.warehouses
  for each row execute function private.guard_warehouse_escalation();

-- ------------------------------------------------------------
-- 9. Enable Supabase Realtime for live Admin / App updates
-- ------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'bookings',
    'booking_items',
    'warehouses',
    'storage_bookings',
    'warehouse_tracking_logs'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 9. Seed Official SmartShift Hub Warehouses (if table is empty)
--    so Customers & Admin Tracking have live facilities ready
--    immediately alongside partner-submitted warehouses.
-- ------------------------------------------------------------
insert into public.warehouses (
  owner_id, name, description, city, address, lat, lng,
  contact_phone, contact_email, image_url,
  total_capacity_sqm, occupied_capacity_sqm,
  small_units_total, small_units_available,
  medium_units_total, medium_units_available,
  large_units_total, large_units_available,
  small_rate_daily, medium_rate_daily, large_rate_daily,
  climate_controlled, cctv_enabled, insured, security_24_7,
  temperature_c, humidity_pct, operational_status,
  verification_status, verified_at, rating
)
select
  u.id,
  v.name,
  v.description,
  v.city,
  v.address,
  v.lat,
  v.lng,
  v.contact_phone,
  v.contact_email,
  v.image_url,
  v.total_capacity_sqm,
  v.occupied_capacity_sqm,
  v.small_units_total,
  v.small_units_available,
  v.medium_units_total,
  v.medium_units_available,
  v.large_units_total,
  v.large_units_available,
  v.small_rate_daily,
  v.medium_rate_daily,
  v.large_rate_daily,
  true, true, true, true,
  v.temperature_c,
  v.humidity_pct,
  'open',
  'approved',
  now(),
  4.9
from auth.users u
cross join (
  values
    (
      'SmartShift Gulberg Climate Hub',
      'Flagship climate-controlled household & commercial storage hub in Central Lahore with 24/7 CCTV, biometric access, and forklift loading bays.',
      'Lahore',
      'Main Boulevard, Gulberg III, Lahore, Pakistan',
      31.5105, 74.3490,
      '+92 300 8491001', 'gulberg.hub@smartshift.pk',
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
      1200, 320, 20, 16, 15, 11, 8, 6,
      200, 450, 900, 21.0, 42
    ),
    (
      'SmartShift Johar Town Vault',
      'High-security residential furniture & fragile-item storage facility near Expo Center Lahore with humidity sensors and full goods insurance.',
      'Lahore',
      'Khayaban-e-Jinnah, Johar Town, Lahore, Pakistan',
      31.4697, 74.2728,
      '+92 300 8491002', 'johartown.hub@smartshift.pk',
      'https://images.unsplash.com/photo-1553413077-190dd305871c?w=900&auto=format&fit=crop&q=80',
      850, 190, 16, 13, 12, 9, 6, 5,
      180, 420, 850, 22.0, 46
    ),
    (
      'SmartShift Islamabad I-9 Hub',
      'Insured commercial and home relocation storage center serving Islamabad and Rawalpindi with drive-in truck bays.',
      'Islamabad',
      'Industrial Area Sector I-9/3, Islamabad, Pakistan',
      33.6584, 73.0581,
      '+92 300 8491003', 'islamabad.hub@smartshift.pk',
      'https://images.unsplash.com/photo-1565891741441-64926e441838?w=900&auto=format&fit=crop&q=80',
      1000, 240, 18, 15, 12, 10, 6, 5,
      220, 480, 950, 20.5, 44
    )
) as v(
  name, description, city, address, lat, lng,
  contact_phone, contact_email, image_url,
  total_capacity_sqm, occupied_capacity_sqm,
  small_units_total, small_units_available,
  medium_units_total, medium_units_available,
  large_units_total, large_units_available,
  small_rate_daily, medium_rate_daily, large_rate_daily,
  temperature_c, humidity_pct
)
where u.email = 'admin@smartshift.pk'
  and not exists (select 1 from public.warehouses);
