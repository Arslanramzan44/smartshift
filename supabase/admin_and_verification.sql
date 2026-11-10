-- ============================================================
-- SmartShift — Admin & Driver Verification & Live Tracking Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Extend profiles table with driver verification and admin flags
alter table public.profiles
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected', 'suspended')),
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_banned boolean not null default false,
  add column if not exists driver_lat numeric,
  add column if not exists driver_lng numeric,
  add column if not exists vehicle_type text default 'Standard Van',
  add column if not exists vehicle_plate text default 'LEA-0000',
  add column if not exists last_active_at timestamptz default now();

-- Update any existing customer profiles to be approved by default
update public.profiles
set verification_status = 'approved'
where role = 'customer' and (verification_status is null or verification_status = 'pending');

-- 2. Extend bookings table with coordinates for live tracking
alter table public.bookings
  add column if not exists driver_lat numeric,
  add column if not exists driver_lng numeric,
  add column if not exists pickup_lat numeric,
  add column if not exists pickup_lng numeric,
  add column if not exists dropoff_lat numeric,
  add column if not exists dropoff_lng numeric,
  add column if not exists cancellation_reason text;

-- 3. Storage bucket access for admin document reviews
-- Allow authenticated users to view mover documents (so admin can inspect driving license, CNIC, police clearance)
drop policy if exists "moverdocs_read_admin_or_all" on storage.objects;
create policy "moverdocs_read_admin_or_all" on storage.objects
  for select to authenticated
  using (bucket_id = 'mover-docs');

-- 4. RLS policies allowing admin full oversight
-- Profiles: allow admin full access to view and update any profile
drop policy if exists "admin_manage_profiles" on public.profiles;
create policy "admin_manage_profiles" on public.profiles
  for all to authenticated
  using (true)
  with check (true);

-- Bookings: allow admin full access to manage all bookings
drop policy if exists "admin_manage_bookings" on public.bookings;
create policy "admin_manage_bookings" on public.bookings
  for all to authenticated
  using (true)
  with check (true);

-- Booking items: allow admin full access
drop policy if exists "admin_manage_booking_items" on public.booking_items;
create policy "admin_manage_booking_items" on public.booking_items
  for all to authenticated
  using (true)
  with check (true);
