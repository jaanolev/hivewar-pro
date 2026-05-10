-- ─────────────────────────────────────────────────────────────
-- Realtime collab v1, part 1: sharing + collaborator schema
--
-- Adds:
--   * share_token / view_token columns on plans (lazy-generated)
--   * plan_collaborators table (plan_id, user_id, role)
--   * editor_user_id + editor_acquired_at columns for the single-
--     editor lock (used in part 2)
--   * RLS updates so collaborators can read/write the plan
--   * Owner-enforcement trigger so collaborators can't take ownership
--   * RPCs: get_or_create_share_tokens, join_plan_by_token
--   * plans added to the realtime publication
-- ─────────────────────────────────────────────────────────────

-- Columns on plans
alter table public.plans
  add column if not exists share_token text unique,
  add column if not exists view_token text unique,
  add column if not exists editor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists editor_acquired_at timestamptz;

create index if not exists plans_share_token_idx
  on public.plans (share_token) where share_token is not null;

create index if not exists plans_view_token_idx
  on public.plans (view_token) where view_token is not null;

-- Collaborators table
create table if not exists public.plan_collaborators (
  plan_id        text not null references public.plans(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           text not null check (role in ('viewer', 'editor')),
  joined_at      timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create index if not exists plan_collaborators_user_idx
  on public.plan_collaborators (user_id);

alter table public.plan_collaborators enable row level security;

drop policy if exists "plan_collaborators_select_own" on public.plan_collaborators;
create policy "plan_collaborators_select_own"
  on public.plan_collaborators for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Owner-enforcement trigger on plans:
--   * On INSERT: force owner_user_id = auth.uid()
--   * On UPDATE: keep owner_user_id unchanged
-- This lets collaborators safely upsert the plan body without
-- having to know or care about the owner_user_id field.
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_plans_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.owner_user_id := coalesce(auth.uid(), new.owner_user_id);
  elsif tg_op = 'UPDATE' then
    new.owner_user_id := old.owner_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists plans_enforce_owner on public.plans;
create trigger plans_enforce_owner
  before insert or update on public.plans
  for each row execute function public.enforce_plans_owner();

-- ─────────────────────────────────────────────────────────────
-- RLS on plans: owner OR collaborator can read & update.
-- INSERT remains owner-only. DELETE remains owner-only.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "plans_select_own" on public.plans;
drop policy if exists "plans_insert_own" on public.plans;
drop policy if exists "plans_update_own" on public.plans;
drop policy if exists "plans_delete_own" on public.plans;

drop policy if exists "plans_select" on public.plans;
drop policy if exists "plans_insert" on public.plans;
drop policy if exists "plans_update" on public.plans;
drop policy if exists "plans_delete" on public.plans;

create policy "plans_select"
  on public.plans for select
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.plan_collaborators c
      where c.plan_id = plans.id and c.user_id = auth.uid()
    )
  );

create policy "plans_insert"
  on public.plans for insert
  with check (auth.uid() = owner_user_id);

create policy "plans_update"
  on public.plans for update
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.plan_collaborators c
      where c.plan_id = plans.id
        and c.user_id = auth.uid()
        and c.role = 'editor'
    )
  )
  with check (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.plan_collaborators c
      where c.plan_id = plans.id
        and c.user_id = auth.uid()
        and c.role = 'editor'
    )
  );

create policy "plans_delete"
  on public.plans for delete
  using (auth.uid() = owner_user_id);

-- ─────────────────────────────────────────────────────────────
-- RPC: owner generates (or fetches) the two share tokens for a plan.
-- Returns both as a JSON object: { share_token, view_token }.
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_or_create_share_tokens(plan_id_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share text;
  v_view  text;
  v_user  uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'must be signed in';
  end if;

  if not exists (
    select 1 from public.plans
    where id = plan_id_input and owner_user_id = v_user
  ) then
    raise exception 'only the plan owner can create share links';
  end if;

  select share_token, view_token into v_share, v_view
  from public.plans where id = plan_id_input;

  if v_share is null then
    v_share := replace(gen_random_uuid()::text, '-', '');
  end if;
  if v_view is null then
    v_view := replace(gen_random_uuid()::text, '-', '');
  end if;

  update public.plans
  set share_token = v_share, view_token = v_view
  where id = plan_id_input;

  return jsonb_build_object('share_token', v_share, 'view_token', v_view);
end;
$$;

grant execute on function public.get_or_create_share_tokens(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC: join a plan by token. Matches the token against either the
-- edit (share) or the view token, adds the caller to plan_collaborators
-- with the appropriate role, returns the plan id + role so the client
-- can load the plan.
-- ─────────────────────────────────────────────────────────────
create or replace function public.join_plan_by_token(token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id text;
  v_role    text;
  v_user    uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'must be signed in';
  end if;

  -- Edit token wins if both match (shouldn't happen since tokens are unique).
  select id into v_plan_id from public.plans where share_token = token;
  if v_plan_id is not null then
    v_role := 'editor';
  else
    select id into v_plan_id from public.plans where view_token = token;
    if v_plan_id is not null then
      v_role := 'viewer';
    end if;
  end if;

  if v_plan_id is null then
    raise exception 'invalid share token';
  end if;

  insert into public.plan_collaborators (plan_id, user_id, role)
  values (v_plan_id, v_user, v_role)
  on conflict (plan_id, user_id) do update
    set role = excluded.role;  -- upgrade viewer -> editor if a better link is used

  return jsonb_build_object('plan_id', v_plan_id, 'role', v_role);
end;
$$;

grant execute on function public.join_plan_by_token(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Realtime: publish plan row changes so subscribers get UPDATEs.
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'plans'
  ) then
    alter publication supabase_realtime add table public.plans;
  end if;
end$$;
