-- ============================================================
-- SmartShift — bookings + booking_items
-- Run AFTER schema.sql in: Dashboard > SQL Editor > New query
-- ============================================================

-- ------------------------------------------------------------
-- 1. bookings
-- ------------------------------------------------------------
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references auth.users (id) on delete cascade,
  mover_id        uuid references auth.users (id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending','accepted','en_route','loading','in_transit','at_dropoff','delivered','cancelled')),
  pickup_address  text not null,
  dropoff_address text not null,
  vehicle         text,
  schedule_label  text,
  scheduled_at    timestamptz,
  distance_km     numeric,
  price           numeric not null default 0,
  notes           text,
  -- denormalized so a mover can see customer contact without reading profiles
  customer_name   text,
  customer_phone  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  completed_at    timestamptz
);

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_mover_idx  on public.bookings (mover_id);
create index if not exists bookings_customer_idx on public.bookings (customer_id);

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. booking_items (each item gets a QR code, scanned by the mover)
-- ------------------------------------------------------------
create table if not exists public.booking_items (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  name        text not null,
  tag         text,
  qr_code     text,
  scanned     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists booking_items_booking_idx on public.booking_items (booking_id);

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;

-- bookings: customer sees own; mover sees unassigned-pending OR jobs assigned to them
drop policy if exists "bookings_select" on public.bookings;
create policy "bookings_select" on public.bookings
  for select to authenticated
  using (
    customer_id = auth.uid()
    or mover_id = auth.uid()
    or (status = 'pending' and mover_id is null)
  );

-- only the customer creates their own booking
drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings
  for insert to authenticated
  with check (customer_id = auth.uid());

-- customer can update own booking (e.g. cancel)
drop policy if exists "bookings_update_customer" on public.bookings;
create policy "bookings_update_customer" on public.bookings
  for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- mover can claim an unassigned pending job, then manage their own jobs
drop policy if exists "bookings_update_mover" on public.bookings;
create policy "bookings_update_mover" on public.bookings
  for update to authenticated
  using (mover_id = auth.uid() or (status = 'pending' and mover_id is null))
  with check (mover_id = auth.uid());

-- booking_items: visible to anyone who can see the parent booking
drop policy if exists "booking_items_select" on public.booking_items;
create policy "booking_items_select" on public.booking_items
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_items.booking_id
      and (b.customer_id = auth.uid()
        or b.mover_id = auth.uid()
        or (b.status = 'pending' and b.mover_id is null))
  ));

-- customer inserts items for their own booking
drop policy if exists "booking_items_insert" on public.booking_items;
create policy "booking_items_insert" on public.booking_items
  for insert to authenticated
  with check (exists (
    select 1 from public.bookings b
    where b.id = booking_items.booking_id and b.customer_id = auth.uid()
  ));

-- the assigned mover updates items (scanning)
drop policy if exists "booking_items_update_mover" on public.booking_items;
create policy "booking_items_update_mover" on public.booking_items
  for update to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_items.booking_id and b.mover_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.bookings b
    where b.id = booking_items.booking_id and b.mover_id = auth.uid()
  ));
