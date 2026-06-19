-- ============================================================
-- SmartShift — reviews (customer rates the mover after delivery)
-- Run AFTER bookings.sql in: Dashboard > SQL Editor > New query
-- ============================================================

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  -- one review per booking
  booking_id   uuid not null unique references public.bookings (id) on delete cascade,
  customer_id  uuid not null references auth.users (id) on delete cascade,
  mover_id     uuid references auth.users (id) on delete set null,
  rating       int not null check (rating between 1 and 5),
  tags         text[],
  comment      text,
  tip          numeric not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists reviews_mover_idx    on public.reviews (mover_id);
create index if not exists reviews_customer_idx on public.reviews (customer_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.reviews enable row level security;

-- customer sees own reviews; mover sees reviews left for them
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews
  for select to authenticated
  using (customer_id = auth.uid() or mover_id = auth.uid());

-- customer can review only their own, delivered booking
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.customer_id = auth.uid()
        and b.status = 'delivered'
    )
  );
