create or replace function public.reset_student_tasks(
  p_student_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_student public.students%rowtype;
  v_is_admin boolean := public.is_platform_admin(auth.uid());
  v_is_owner boolean := false;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_task_ids uuid[] := '{}'::uuid[];
  v_goal_ids uuid[] := '{}'::uuid[];
  v_deleted_tasks integer := 0;
  v_deleted_notifications integer := 0;
  v_reset_goals integer := 0;
  v_detached_gifts integer := 0;
  v_preserved_point_entries integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select s.* into v_student
  from public.students s
  where s.id = p_student_id
  for update;

  if v_student.id is null then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  v_is_owner := public.is_organization_owner(v_student.organization_id);
  if not (v_is_admin or v_is_owner) then
    raise exception 'TASK_RESET_ACCESS_DENIED';
  end if;

  select
    coalesce(array_agg(t.id), '{}'::uuid[]),
    coalesce(array_agg(distinct t.goal_id) filter (where t.goal_id is not null), '{}'::uuid[]),
    count(*)::integer
  into v_task_ids, v_goal_ids, v_deleted_tasks
  from public.tasks t
  where t.student_id = p_student_id;

  if v_deleted_tasks = 0 then
    return jsonb_build_object(
      'deleted_tasks', 0,
      'deleted_notifications', 0,
      'reset_goals', 0,
      'detached_gifts', 0,
      'preserved_point_entries', 0,
      'points_preserved', true,
      'quran_programs_preserved', true
    );
  end if;

  select count(*)::integer into v_detached_gifts
  from public.child_gifts cg
  where cg.task_id = any(v_task_ids);

  select count(*)::integer into v_preserved_point_entries
  from public.points_ledger pl
  where pl.student_id = p_student_id
    and pl.source_type = 'task'
    and pl.source_id = any(v_task_ids);

  delete from public.child_notifications cn
  where cn.student_id = p_student_id
    and (
      cn.action_type = 'task'
      or cn.notification_type = 'task'
      or cn.action_id = any(v_task_ids)
    );
  get diagnostics v_deleted_notifications = row_count;

  if cardinality(v_goal_ids) > 0 then
    delete from public.rewards r
    where r.goal_id = any(v_goal_ids)
      and r.status <> 'paid';
  end if;

  delete from public.tasks t
  where t.id = any(v_task_ids);

  if cardinality(v_goal_ids) > 0 then
    update public.goals g
    set task_plan_count = 0,
        task_plan_mode = null,
        converted_to_tasks_at = null,
        progress = case
          when exists (
            select 1 from public.rewards r
            where r.goal_id = g.id and r.status = 'paid'
          ) then g.progress
          else 0
        end,
        status = case
          when g.status = 'paused' then 'paused'::public.goal_status
          when g.status = 'closed' then 'closed'::public.goal_status
          when exists (
            select 1 from public.rewards r
            where r.goal_id = g.id and r.status = 'paid'
          ) then 'completed'::public.goal_status
          else 'approved'::public.goal_status
        end,
        updated_at = now()
    where g.id = any(v_goal_ids);
    get diagnostics v_reset_goals = row_count;
  end if;

  if v_is_admin then
    insert into public.admin_audit_logs(
      admin_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      auth.uid(),
      'reset_student_tasks',
      'student',
      p_student_id,
      jsonb_build_object(
        'deleted_tasks', v_deleted_tasks,
        'deleted_notifications', v_deleted_notifications,
        'reset_goals', v_reset_goals,
        'detached_gifts', v_detached_gifts,
        'preserved_point_entries', v_preserved_point_entries,
        'reason', v_reason
      )
    );
  end if;

  return jsonb_build_object(
    'deleted_tasks', v_deleted_tasks,
    'deleted_notifications', v_deleted_notifications,
    'reset_goals', v_reset_goals,
    'detached_gifts', v_detached_gifts,
    'preserved_point_entries', v_preserved_point_entries,
    'points_preserved', true,
    'quran_programs_preserved', true
  );
end;
$function$;

create or replace function public.parent_zero_student_tasks(p_student_id uuid)
returns jsonb
language sql
security definer
set search_path to 'public', 'auth'
as $function$
  select public.reset_student_tasks(
    p_student_id,
    'تصفير جميع المهام من ملف الطفل'
  );
$function$;

create or replace function public.admin_reset_student_tasks(
  p_student_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'ADMIN_ACCESS_DENIED';
  end if;

  return public.reset_student_tasks(
    p_student_id,
    coalesce(nullif(trim(p_reason), ''), 'تصفير إداري لجميع المهام')
  );
end;
$function$;

revoke all on function public.reset_student_tasks(uuid,text) from public, anon;
revoke all on function public.parent_zero_student_tasks(uuid) from public, anon;
revoke all on function public.admin_reset_student_tasks(uuid,text) from public, anon;

grant execute on function public.reset_student_tasks(uuid,text) to authenticated;
grant execute on function public.parent_zero_student_tasks(uuid) to authenticated;
grant execute on function public.admin_reset_student_tasks(uuid,text) to authenticated;
