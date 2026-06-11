-- ============================================================
-- SmartShift — warehouse storage reservations
-- Run AFTER schema.sql in: Dashboard > SQL Editor > New query
-- Backs src/lib/storage.js (createStorageBooking / listStorageBookings).
-- ============================================================

create table if not exists public.storage_bookings (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references auth.users (id) on delete cascade,
  unit_size       text not null,
  warehouse       text not null,
  duration_label  text not null,
  days            int not null,
  start_date      date,
  price           numeric not null,
  status          text not null default 'reserved',
  created_at      timestamptz not null default now()
);

create index if not exists storage_bookings_customer_idx
  on public.storage_bookings (customer_id);

-- ------------------------------------------------------------
-- RLS — each customer sees/edits only their own reservations
-- ------------------------------------------------------------
alter table public.storage_bookings enable row level security;

drop policy if exists "storage_bookings_own" on public.storage_bookings;
create policy "storage_bookings_own" on public.storage_bookings
  for all to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
