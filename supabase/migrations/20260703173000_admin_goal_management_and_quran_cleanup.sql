create or replace function public.cleanup_quran_goal_after_plan_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if old.goal_id is not null
     and not exists (select 1 from public.quran_plans qp where qp.goal_id = old.goal_id)
     and exists (select 1 from public.goals g where g.id = old.goal_id and g.category = 'quran') then
    delete from public.goals where id = old.goal_id;
  end if;
  return old;
end;
$$;

drop trigger if exists cleanup_quran_goal_after_plan_delete_trigger on public.quran_plans;
create trigger cleanup_quran_goal_after_plan_delete_trigger
after delete on public.quran_plans
for each row execute function public.cleanup_quran_goal_after_plan_delete();

create or replace function public.get_admin_goals_dashboard(p_search text default '', p_status text default 'all', p_limit integer default 300)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 300), 500));
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return jsonb_build_object(
    'admin', (select jsonb_build_object('role', a.role, 'user_id', a.user_id) from public.platform_admins a where a.user_id = auth.uid() and a.is_active),
    'metrics', jsonb_build_object(
      'total', (select count(*) from public.goals),
      'active', (select count(*) from public.goals where status in ('approved','active','paused')),
      'requested', (select count(*) from public.goals where status in ('requested','pending')),
      'completed', (select count(*) from public.goals where status = 'completed'),
      'orphan_quran', (select count(*) from public.goals g where g.category = 'quran' and not exists (select 1 from public.quran_plans qp where qp.goal_id = g.id))
    ),
    'goals', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select g.id, g.title, g.description, g.category, g.goal_type, g.status,
          coalesce(g.progress, 0) as progress, g.due_date, g.created_at, g.updated_at,
          g.organization_id, g.student_id, s.full_name as student_name, o.name as organization_name,
          (select count(*) from public.tasks t where t.goal_id = g.id) as task_count,
          (select count(*) from public.quran_plans qp where qp.goal_id = g.id) as quran_plan_count,
          (g.category = 'quran' and not exists (select 1 from public.quran_plans qp where qp.goal_id = g.id)) as is_orphan_quran
        from public.goals g
        join public.students s on s.id = g.student_id
        join public.organizations o on o.id = g.organization_id
        where (p_status = 'all' or g.status = p_status)
          and (v_search is null or coalesce(g.title, '') ilike '%' || v_search || '%'
            or coalesce(g.description, '') ilike '%' || v_search || '%'
            or coalesce(s.full_name, '') ilike '%' || v_search || '%'
            or coalesce(o.name, '') ilike '%' || v_search || '%')
        order by g.created_at desc limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_update_goal(p_goal_id uuid, p_title text, p_description text, p_goal_type text, p_status text, p_progress integer, p_due_date date, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_admin_role text;
  v_goal public.goals%rowtype;
  v_progress integer := greatest(0, least(coalesce(p_progress, 0), 100));
begin
  select role into v_admin_role from public.platform_admins where user_id = auth.uid() and is_active;
  if v_admin_role not in ('super_admin','operations_admin') then raise exception 'ADMIN_GOAL_WRITE_DENIED'; end if;
  select * into v_goal from public.goals where id = p_goal_id for update;
  if v_goal.id is null then raise exception 'GOAL_NOT_FOUND'; end if;
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'GOAL_TITLE_REQUIRED'; end if;
  if p_goal_type not in ('educational','behavioral','financial','material') then raise exception 'INVALID_GOAL_TYPE'; end if;
  if p_status not in ('requested','pending','approved','active','paused','completed','rejected') then raise exception 'INVALID_GOAL_STATUS'; end if;

  update public.goals set title = trim(p_title), description = nullif(trim(coalesce(p_description, '')), ''),
    goal_type = p_goal_type, status = p_status, progress = v_progress, due_date = p_due_date, updated_at = now()
  where id = p_goal_id;
  update public.quran_plans set title = trim(p_title), due_date = p_due_date, updated_at = now() where goal_id = p_goal_id;

  insert into public.admin_audit_logs(admin_user_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'update_goal', 'goal', p_goal_id,
    jsonb_build_object('previous_title', v_goal.title, 'title', trim(p_title), 'previous_status', v_goal.status,
      'status', p_status, 'previous_progress', v_goal.progress, 'progress', v_progress,
      'student_id', v_goal.student_id, 'reason', coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'تعديل إداري')));

  return jsonb_build_object('ok', true, 'goal_id', p_goal_id, 'status', p_status, 'progress', v_progress);
end;
$$;

create or replace function public.admin_delete_goal_completely(p_goal_id uuid, p_confirmation text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_admin_role text;
  v_goal public.goals%rowtype;
  v_task_count integer := 0;
  v_plan_count integer := 0;
  v_reward_count integer := 0;
  v_task_points integer := 0;
  v_quran_points integer := 0;
begin
  select role into v_admin_role from public.platform_admins where user_id = auth.uid() and is_active;
  if v_admin_role is distinct from 'super_admin' then raise exception 'SUPER_ADMIN_REQUIRED'; end if;
  select * into v_goal from public.goals where id = p_goal_id for update;
  if v_goal.id is null then raise exception 'GOAL_NOT_FOUND'; end if;
  if trim(coalesce(p_confirmation, '')) <> trim(coalesce(v_goal.title, '')) then raise exception 'CONFIRMATION_MISMATCH'; end if;

  select count(*) into v_task_count from public.tasks where goal_id = p_goal_id;
  select count(*) into v_plan_count from public.quran_plans where goal_id = p_goal_id;
  delete from public.points_ledger pl using public.tasks t where t.goal_id = p_goal_id and pl.source_type = 'task' and pl.source_id = t.id;
  get diagnostics v_task_points = row_count;
  delete from public.points_ledger pl using public.quran_segments qs, public.quran_plans qp
    where qp.goal_id = p_goal_id and qs.plan_id = qp.id and pl.source_type = 'quran_segment' and pl.source_id = qs.id;
  get diagnostics v_quran_points = row_count;
  delete from public.rewards where goal_id = p_goal_id;
  get diagnostics v_reward_count = row_count;
  delete from public.quran_plans where goal_id = p_goal_id;
  delete from public.goals where id = p_goal_id;

  update public.students s set achievement_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
    reward_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'reward'), 0),
    points_balance = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0), updated_at = now()
  where s.id = v_goal.student_id;

  insert into public.admin_audit_logs(admin_user_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'delete_goal_completely', 'goal', p_goal_id,
    jsonb_build_object('title', v_goal.title, 'student_id', v_goal.student_id, 'deleted_tasks', v_task_count,
      'deleted_quran_plans', v_plan_count, 'deleted_rewards', v_reward_count,
      'removed_task_points', v_task_points, 'removed_quran_points', v_quran_points,
      'reason', coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'حذف إداري')));

  return jsonb_build_object('ok', true, 'goal_id', p_goal_id, 'deleted_tasks', v_task_count, 'deleted_quran_plans', v_plan_count);
end;
$$;

revoke all on function public.get_admin_goals_dashboard(text, text, integer) from public, anon;
revoke all on function public.admin_update_goal(uuid, text, text, text, text, integer, date, text) from public, anon;
revoke all on function public.admin_delete_goal_completely(uuid, text, text) from public, anon;
grant execute on function public.get_admin_goals_dashboard(text, text, integer) to authenticated;
grant execute on function public.admin_update_goal(uuid, text, text, text, text, integer, date, text) to authenticated;
grant execute on function public.admin_delete_goal_completely(uuid, text, text) to authenticated;
