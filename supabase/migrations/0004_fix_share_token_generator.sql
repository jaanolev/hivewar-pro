-- Fix for 0003: get_or_create_share_tokens used gen_random_bytes from
-- the pgcrypto extension, but the function's search_path is set to
-- "public" only, which can't see the extensions schema. Switch to
-- gen_random_uuid() which is in pg_catalog (always available) and
-- gives the same 128 bits of entropy.

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
