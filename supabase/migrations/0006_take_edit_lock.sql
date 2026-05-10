-- User-driven lock toggle: anyone with edit access can take the lock
-- at any time, no waiting for the current holder to go stale. Pairs
-- with the existing acquire_edit_lock (only-if-free) which is still
-- used for the implicit auto-acquire when opening a plan.

create or replace function public.take_edit_lock(plan_id_input text)
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

  update public.plans
  set editor_user_id = v_user, editor_acquired_at = v_now
  where id = plan_id_input
  returning editor_user_id, editor_acquired_at
    into v_editor, v_acquired;

  return jsonb_build_object(
    'editor_user_id', v_editor,
    'editor_acquired_at', v_acquired,
    'acquired', true
  );
end;
$$;

grant execute on function public.take_edit_lock(text) to authenticated;
