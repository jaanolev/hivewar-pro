-- Edit lock RPCs for realtime collab chunk 2.
--
-- The single-editor lock prevents conflicting edits: only the user
-- whose id is in plans.editor_user_id may make changes (enforced by
-- the client + by the RLS update policy via plan_collaborators role).
-- Locks expire after 3 minutes of no heartbeat so a forgotten tab
-- doesn't permanently strand the lock.

create or replace function public.acquire_edit_lock(plan_id_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_editor uuid;
  v_acquired timestamptz;
begin
  if v_user is null then
    raise exception 'must be signed in';
  end if;

  -- Caller must be owner OR a collaborator with editor role.
  if not exists (
    select 1 from public.plans p
    where p.id = plan_id_input and p.owner_user_id = v_user
  ) and not exists (
    select 1 from public.plan_collaborators c
    where c.plan_id = plan_id_input
      and c.user_id = v_user
      and c.role = 'editor'
  ) then
    raise exception 'no edit access to this plan';
  end if;

  -- Atomically claim the lock if it's free, already ours, or stale.
  update public.plans
  set editor_user_id = v_user, editor_acquired_at = v_now
  where id = plan_id_input
    and (
      editor_user_id is null
      or editor_user_id = v_user
      or editor_acquired_at < v_now - interval '3 minutes'
    )
  returning editor_user_id, editor_acquired_at
    into v_editor, v_acquired;

  if v_editor is null then
    -- Didn't get the lock; read whoever has it now.
    select editor_user_id, editor_acquired_at
      into v_editor, v_acquired
    from public.plans where id = plan_id_input;
  end if;

  return jsonb_build_object(
    'editor_user_id', v_editor,
    'editor_acquired_at', v_acquired,
    'acquired', (v_editor = v_user)
  );
end;
$$;

grant execute on function public.acquire_edit_lock(text) to authenticated;

create or replace function public.heartbeat_edit_lock(plan_id_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return; end if;
  update public.plans
  set editor_acquired_at = now()
  where id = plan_id_input
    and editor_user_id = v_user;
end;
$$;

grant execute on function public.heartbeat_edit_lock(text) to authenticated;

create or replace function public.release_edit_lock(plan_id_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return; end if;
  update public.plans
  set editor_user_id = null, editor_acquired_at = null
  where id = plan_id_input
    and editor_user_id = v_user;
end;
$$;

grant execute on function public.release_edit_lock(text) to authenticated;
