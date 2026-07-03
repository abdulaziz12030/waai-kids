create or replace function public.complete_account_onboarding(
  p_full_name text,
  p_organization_name text,
  p_account_type text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_type public.org_type;
  v_role public.user_role;
  v_existing_type text;
  v_existing_owner uuid;
  v_status text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'FULL_NAME_REQUIRED'; end if;
  if length(trim(coalesce(p_organization_name, ''))) < 2 then raise exception 'ORGANIZATION_NAME_REQUIRED'; end if;
  if p_account_type not in ('family', 'teacher') then raise exception 'INVALID_ACCOUNT_TYPE'; end if;

  select c.account_status into v_status
  from public.account_admin_controls c where c.user_id = v_user_id;
  if coalesce(v_status, 'active') <> 'active' then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;

  v_org_type := case when p_account_type = 'teacher' then 'independent_teacher'::public.org_type else 'family'::public.org_type end;
  v_role := case when p_account_type = 'teacher' then 'teacher'::public.user_role else 'owner'::public.user_role end;

  select o.type::text, o.owner_id into v_existing_type, v_existing_owner
  from public.organizations o where o.id = v_user_id;
  if v_existing_owner is not null and v_existing_owner <> v_user_id then raise exception 'ORGANIZATION_CONFLICT'; end if;
  if v_existing_type is not null and v_existing_type <> v_org_type::text
     and exists (select 1 from public.students s where s.organization_id = v_user_id) then
    raise exception 'ACCOUNT_TYPE_LOCKED';
  end if;

  insert into public.profiles(id, full_name, updated_at)
  values(v_user_id, trim(p_full_name), now())
  on conflict(id) do update set full_name = excluded.full_name, updated_at = now();

  insert into public.organizations(id, name, type, owner_id, family_code, family_title, guardian_display_name, updated_at)
  values(
    v_user_id,
    trim(p_organization_name),
    v_org_type,
    v_user_id,
    public.generate_family_code(),
    case when p_account_type = 'family' then trim(p_organization_name) else null end,
    case when p_account_type = 'family' then trim(p_full_name) else null end,
    now()
  )
  on conflict(id) do update set
    name = excluded.name,
    type = excluded.type,
    owner_id = excluded.owner_id,
    family_title = case when excluded.type::text = 'family' then excluded.name else public.organizations.family_title end,
    guardian_display_name = case when excluded.type::text = 'family' then trim(p_full_name) else public.organizations.guardian_display_name end,
    updated_at = now();

  delete from public.memberships
  where organization_id = v_user_id and user_id = v_user_id and role <> v_role;

  insert into public.memberships(organization_id, user_id, role, display_name, is_active)
  values(v_user_id, v_user_id, v_role, trim(p_full_name), true)
  on conflict(organization_id, user_id, role) do update
    set display_name = excluded.display_name, is_active = true;

  insert into public.account_admin_controls(user_id, account_status, teacher_access_enabled, updated_at)
  values(v_user_id, 'active', true, now())
  on conflict(user_id) do update set
    account_status = 'active',
    teacher_access_enabled = case when p_account_type = 'teacher' then true else public.account_admin_controls.teacher_access_enabled end,
    deleted_at = null,
    suspended_at = null,
    updated_at = now();

  return jsonb_build_object(
    'user_id', v_user_id,
    'organization_id', v_user_id,
    'account_type', p_account_type,
    'role', v_role::text,
    'status', 'active'
  );
end;
$$;

revoke all on function public.complete_account_onboarding(text, text, text) from public;
grant execute on function public.complete_account_onboarding(text, text, text) to authenticated;
