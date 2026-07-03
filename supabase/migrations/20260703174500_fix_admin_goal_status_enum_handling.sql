create or replace function public.get_admin_goals_dashboard(
  p_search text default '',
  p_status text default 'all',
  p_limit integer default 300
)
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
      'active', (select count(*) from public.goals where status::text in ('approved','active','paused')),
      'requested', (select count(*) from public.goals where status::text in ('requested','pending','draft')),
      'completed', (select count(*) from public.goals where status::text in ('completed','reward_due','reward_scheduled','closed')),
      'orphan_quran', (select count(*) from public.goals g where g.category = 'quran' and not exists (select 1 from public.quran_plans qp where qp.goal_id = g.id))
    ),
    'goals', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select g.id, g.title, g.description, g.category, g.goal_type, g.status::text as status,
          coalesce(g.progress, 0) as progress, g.due_date, g.created_at, g.updated_at,
          g.organization_id, g.student_id, s.full_name as student_name, o.name as organization_name,
          (select count(*) from public.tasks t where t.goal_id = g.id) as task_count,
          (select count(*) from public.quran_plans qp where qp.goal_id = g.id) as quran_plan_count,
          (g.category = 'quran' and not exists (select 1 from public.quran_plans qp where qp.goal_id = g.id)) as is_orphan_quran
        from public.goals g
        join public.students s on s.id = g.student_id
        join public.organizations o on o.id = g.organization_id
        where (p_status = 'all' or g.status::text = p_status)
          and (v_search is null or coalesce(g.title, '') ilike '%' || v_search || '%'
            or coalesce(g.description, '') ilike '%' || v_search || '%'
            or coalesce(s.full_name, '') ilike '%' || v_search || '%'
            or coalesce(o.name, '') ilike '%' || v_search || '%')
        order by g.created_at desc
        limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_update_goal(
  p_goal_id uuid,
  p_title text,
  p_description text,
  p_goal_type text,
  p_status text,
  p_progress integer,
  p_due_date date,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_admin_role text;
  v_goal public.goals%rowtype;
  v_progress integer := greatest(0, least(coalesce(p_progress, 0), 100));
  v_status public.goal_status;
begin
  select role into v_admin_role from public.platform_admins where user_id = auth.uid() and is_active;
  if v_admin_role not in ('super_admin','operations_admin') then raise exception 'ADMIN_GOAL_WRITE_DENIED'; end if;
  select * into v_goal from public.goals where id = p_goal_id for update;
  if v_goal.id is null then raise exception 'GOAL_NOT_FOUND'; end if;
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'GOAL_TITLE_REQUIRED'; end if;
  if p_goal_type not in ('educational','behavioral','financial','material') then raise exception 'INVALID_GOAL_TYPE'; end if;
  begin
    v_status := p_status::public.goal_status;
  exception when invalid_text_representation then
    raise exception 'INVALID_GOAL_STATUS';
  end;
  update public.goals
  set title = trim(p_title), description = nullif(trim(coalesce(p_description, '')), ''),
      goal_type = p_goal_type, status = v_status, progress = v_progress,
      due_date = p_due_date, updated_at = now()
  where id = p_goal_id;
  update public.quran_plans set title = trim(p_title), due_date = p_due_date, updated_at = now() where goal_id = p_goal_id;
  insert into public.admin_audit_logs(admin_user_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'update_goal', 'goal', p_goal_id,
    jsonb_build_object('previous_title', v_goal.title, 'title', trim(p_title),
      'previous_status', v_goal.status::text, 'status', v_status::text,
      'previous_progress', v_goal.progress, 'progress', v_progress,
      'student_id', v_goal.student_id,
      'reason', coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'تعديل إداري')));
  return jsonb_build_object('ok', true, 'goal_id', p_goal_id, 'status', v_status::text, 'progress', v_progress);
end;
$$;
