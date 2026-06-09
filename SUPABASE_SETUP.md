# SmartShift — Supabase setup

## 1. Create env file
Copy `.env.example` to `.env` and paste your project keys:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

Find them in: Supabase Dashboard → Project Settings → API.

## 2. Run the schema
Open Dashboard → SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
This creates the `profiles` table, RLS policies, and the `avatars` + `mover-docs` storage buckets.

Then run `supabase/bookings.sql` the same way — creates `bookings` + `booking_items`
tables and their RLS so the booking flow (customer → mover) works.

## 3. Turn OFF email confirmation (required)
Dashboard → Authentication → Sign In / Providers → Email → turn **Confirm email OFF**.
Now signup returns a session immediately (no confirmation email needed).

## 4. Add reset-password redirect URL
Dashboard → Authentication → URL Configuration → Redirect URLs → add:
```
http://localhost:5173/reset
```
(and your production URL + `/reset` when deployed)

## 5. Run
```
npm run dev
```

## What works
- **Signup** — customer (name/email/phone/password) or mover (adds required profile photo, driving license, CNIC front+back, police clearance — all required, blocked if any missing).
- **Login / Logout** — real Supabase auth, role-isolated routing.
- **Forgot password** — emails a reset link → `/reset` page sets a new password.
- **Edit profile** — `/profile/edit`, saves to the `profiles` table; movers can re-upload documents.
- Mover docs go to the private `mover-docs` bucket; avatars to the public `avatars` bucket.

## Booking flow (end-to-end)
1. **Customer** books (`/customer/book`) → inserts a `pending` booking + items.
2. **Mover** sees it in **Available Jobs** (`/mover/available`) → **Accept** claims it (atomic).
3. **Mover** drives status in the job detail: Accepted → En Route → Loading → In Transit → At Drop-off → Delivered.
4. **Mover** scans each item's QR during the job (`booking_items.scanned`).
5. **Customer** sees live status on **Track** and **My Moves**.

## Warehouse storage (run this SQL)
The storage feature (`/customer/storage`) needs its own table. Run in
Dashboard → SQL Editor:

```sql
create table if not exists public.storage_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  unit_size text not null,
  warehouse text not null,
  duration_label text not null,
  days int not null,
  start_date date,
  price numeric not null,
  status text not null default 'reserved',
  created_at timestamptz not null default now()
);

alter table public.storage_bookings enable row level security;

create policy "own storage" on public.storage_bookings
  for all
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
```

Customer picks a unit size (Small/Medium/Large), duration (1 week → 3 months),
warehouse, and start date; price = daily rate × days. Reservations are
RLS-scoped to the owner.

