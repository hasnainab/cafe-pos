-- Date: 2026-04-22
-- Basic staff_profiles table and policies for STT POS

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'cashier' check (role in ('admin', 'manager', 'cashier')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;

drop policy if exists "staff can read own profile" on public.staff_profiles;
create policy "staff can read own profile"
on public.staff_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "service role full access to staff_profiles" on public.staff_profiles;
create policy "service role full access to staff_profiles"
on public.staff_profiles
for all
to service_role
using (true)
with check (true);
