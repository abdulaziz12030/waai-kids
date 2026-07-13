create or replace function public.parent_delete_child(
  p_student_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_student public.students%rowtype;
  v_organization_name text;
  v_photo_path text;
  v_goals integer := 0;
  v_tasks integer := 0;
  v_quran_plans integer := 0;
  v_gifts integer := 0;
  v_teacher_links integer := 0;
  v_sessions integer := 0;
begin
  select s.*
  into v_student
  from public.students s
  where s.id = p_student_id
  for update;

  if v_student.id is null then
    raise exception 'CHILD_NOT_FOUND';
  end if;

  if not public.is_organization_owner(v_student.organization_id) then
    raise exception 'CHILD_DELETE_FORBIDDEN';
  end if;

  if trim(coalesce(p_confirmation, '')) <> trim(v_student.full_name) then
    raise exception 'CONFIRMATION_MISMATCH';
  end if;

  select o.name into v_organization_name
  from public.organizations o
  where o.id = v_student.organization_id;

  v_photo_path := nullif(v_student.profile_data ->> 'photo_path', '');

  select count(*) into v_goals from public.goals where student_id = v_student.id;
  select count(*) into v_tasks from public.tasks where student_id = v_student.id;
  select count(*) into v_quran_plans from public.quran_plans where student_id = v_student.id;
  select count(*) into v_gifts from public.child_gifts where student_id = v_student.id;
  select count(*) into v_teacher_links from public.teacher_student_links where student_id = v_student.id;
  select count(*) into v_sessions from public.child_sessions where student_id = v_student.id;

  delete from public.students where id = v_student.id;

  return jsonb_build_object(
    'ok', true,
    'student_id', v_student.id,
    'student_name', v_student.full_name,
    'organization_id', v_student.organization_id,
    'organization_name', v_organization_name,
    'photo_path', v_photo_path,
    'deleted_goals', v_goals,
    'deleted_tasks', v_tasks,
    'deleted_quran_plans', v_quran_plans,
    'deleted_gifts', v_gifts,
    'deleted_teacher_links', v_teacher_links,
    'revoked_sessions', v_sessions
  );
end;
$$;

revoke execute on function public.parent_delete_child(uuid, text) from public, anon;
grant execute on function public.parent_delete_child(uuid, text) to authenticated;

create or replace function public.admin_delete_child(
  p_student_id uuid,
  p_confirmation text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_role text;
  v_student public.students%rowtype;
  v_organization_name text;
  v_photo_path text;
  v_goals integer := 0;
  v_tasks integer := 0;
  v_quran_plans integer := 0;
  v_gifts integer := 0;
  v_teacher_links integer := 0;
  v_sessions integer := 0;
begin
  select role into v_admin_role
  from public.platform_admins
  where user_id = auth.uid() and is_active;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'operations_admin') then
    raise exception 'ADMIN_CHILD_DELETE_FORBIDDEN';
  end if;

  select s.*
  into v_student
  from public.students s
  where s.id = p_student_id
  for update;

  if v_student.id is null then
    raise exception 'CHILD_NOT_FOUND';
  end if;

  if trim(coalesce(p_confirmation, '')) <> trim(v_student.full_name) then
    raise exception 'CONFIRMATION_MISMATCH';
  end if;

  select o.name into v_organization_name
  from public.organizations o
  where o.id = v_student.organization_id;

  v_photo_path := nullif(v_student.profile_data ->> 'photo_path', '');

  select count(*) into v_goals from public.goals where student_id = v_student.id;
  select count(*) into v_tasks from public.tasks where student_id = v_student.id;
  select count(*) into v_quran_plans from public.quran_plans where student_id = v_student.id;
  select count(*) into v_gifts from public.child_gifts where student_id = v_student.id;
  select count(*) into v_teacher_links from public.teacher_student_links where student_id = v_student.id;
  select count(*) into v_sessions from public.child_sessions where student_id = v_student.id;

  delete from public.students where id = v_student.id;

  insert into public.admin_audit_logs(
    admin_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'delete_child_completely',
    'student',
    v_student.id,
    jsonb_build_object(
      'student_name', v_student.full_name,
      'organization_id', v_student.organization_id,
      'organization_name', v_organization_name,
      'deleted_goals', v_goals,
      'deleted_tasks', v_tasks,
      'deleted_quran_plans', v_quran_plans,
      'deleted_gifts', v_gifts,
      'deleted_teacher_links', v_teacher_links,
      'revoked_sessions', v_sessions,
      'reason', coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'حذف إداري لملف طفل')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'student_id', v_student.id,
    'student_name', v_student.full_name,
    'organization_id', v_student.organization_id,
    'organization_name', v_organization_name,
    'photo_path', v_photo_path,
    'deleted_goals', v_goals,
    'deleted_tasks', v_tasks,
    'deleted_quran_plans', v_quran_plans,
    'deleted_gifts', v_gifts,
    'deleted_teacher_links', v_teacher_links,
    'revoked_sessions', v_sessions
  );
end;
$$;

revoke execute on function public.admin_delete_child(uuid, text, text) from public, anon;
grant execute on function public.admin_delete_child(uuid, text, text) to authenticated;

drop policy if exists child_photos_delete_platform_admin on storage.objects;
create policy child_photos_delete_platform_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'child-photos'
  and public.is_platform_admin(auth.uid())
);