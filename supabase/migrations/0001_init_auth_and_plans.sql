-- HiveWar Pro: initial schema for cloud-backed users + plans.
-- Run this in Supabase SQL Editor (or via the Supabase CLI).

-- ─────────────────────────────────────────────────────────────
-- profiles: 1:1 with auth.users, holds display info
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  avatar_url     text,
  alliance_name  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create a profile row whenever a new auth user is created
-- (works for both anonymous and OAuth signups).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- plans: one row per HivePlan, plan body stored as jsonb
-- (matches the existing client-side HivePlan type)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  data            jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists plans_owner_idx on public.plans (owner_user_id);
create index if not exists plans_updated_idx on public.plans (owner_user_id, updated_at desc);

alter table public.plans enable row level security;

-- Owner-only access for v1. Sharing/collab policies will be added in a later migration.
create policy "plans_select_own"
  on public.plans for select
  using (auth.uid() = owner_user_id);

create policy "plans_insert_own"
  on public.plans for insert
  with check (auth.uid() = owner_user_id);

create policy "plans_update_own"
  on public.plans for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "plans_delete_own"
  on public.plans for delete
  using (auth.uid() = owner_user_id);

-- Keep updated_at fresh on every row update
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_touch_updated_at on public.plans;
create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
