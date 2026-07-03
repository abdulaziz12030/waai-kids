create or replace function public.get_child_dashboard(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.expires_at > now()
    and cs.revoked_at is null;

  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;
  update public.child_sessions set last_seen_at = now() where session_token = p_session_token;

  select jsonb_build_object(
    'student', jsonb_build_object(
      'id', s.id,
      'full_name', s.full_name,
      'achievement_points', s.achievement_points,
      'reward_points', s.reward_points,
      'level', public.get_student_level(s.achievement_points),
      'profile_data', s.profile_data
    ),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'title', g.title,
        'description', g.description,
        'goal_type', g.goal_type,
        'status', g.status,
        'progress', g.progress,
        'required_points', g.required_points,
        'target_value', g.target_value,
        'start_date', g.start_date,
        'due_date', g.due_date,
        'decision_note', g.decision_note,
        'decided_at', g.decided_at,
        'task_plan_mode', g.task_plan_mode,
        'task_plan_count', g.task_plan_count,
        'reward_status', r.status,
        'reward_paid_amount', r.paid_amount,
        'reward_granted_at', r.granted_at,
        'reward_grant_note', r.grant_note
      ) order by g.created_at desc)
      from public.goals g
      left join public.rewards r on r.goal_id = g.id
      where g.student_id = s.id
        and g.status::text in ('pending','requested','approved','active','paused','completed','rejected')
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'goal_id', t.goal_id,
        'title', t.title,
        'description', t.description,
        'category', case
          when t.category = 'quran' and coalesce(t.generated_from_goal, false) = false then 'quran_task'
          else t.category
        end,
        'source_category', t.category,
        'difficulty', t.difficulty,
        'achievement_points', t.achievement_points,
        'reward_points', t.reward_points,
        'status', t.status,
        'starts_on', t.starts_on,
        'due_date', t.due_date,
        'plan_step', t.plan_step,
        'plan_total', t.plan_total,
        'generated_from_goal', t.generated_from_goal,
        'child_note', t.child_note,
        'review_note', t.review_note,
        'submitted_at', t.submitted_at,
        'approved_at', t.approved_at,
        'has_gift', exists(select 1 from public.child_gifts cg where cg.task_id = t.id)
      ) order by
        case when t.status::text in ('pending','rejected') then 0 when t.status::text = 'submitted' then 1 else 2 end,
        t.starts_on asc nulls first,
        t.plan_step asc nulls first,
        t.created_at desc)
      from public.tasks t
      where t.student_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.students s
  where s.id = v_student_id;

  return v_result;
end;
$$;

create or replace function public.get_parent_task_recognition_status(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_result jsonb;
begin
  select s.organization_id into v_org_id
  from public.students s
  where s.id = p_student_id;

  if v_org_id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.is_organization_owner(v_org_id) then raise exception 'غير مصرح لك بعرض تكريم المهام'; end if;

  select jsonb_build_object(
    'student_id', p_student_id,
    'tasks', coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'category', t.category,
      'approved_at', t.approved_at,
      'achievement_points', t.achievement_points,
      'reward_points', t.reward_points,
      'gift_count', coalesce(g.gift_count, 0),
      'last_gift_id', g.last_gift_id,
      'last_gift_title', g.last_gift_title,
      'last_gifted_at', g.last_gifted_at
    ) order by t.approved_at desc nulls last), '[]'::jsonb)
  ) into v_result
  from public.tasks t
  left join lateral (
    select
      count(*)::integer as gift_count,
      (array_agg(cg.id order by cg.gifted_at desc))[1] as last_gift_id,
      (array_agg(cg.achievement_title order by cg.gifted_at desc))[1] as last_gift_title,
      max(cg.gifted_at) as last_gifted_at
    from public.child_gifts cg
    where cg.task_id = t.id
  ) g on true
  where t.student_id = p_student_id
    and t.status::text = 'approved';

  return coalesce(v_result, jsonb_build_object('student_id', p_student_id, 'tasks', '[]'::jsonb));
end;
$$;

revoke all on function public.get_parent_task_recognition_status(uuid) from public, anon;
grant execute on function public.get_parent_task_recognition_status(uuid) to authenticated;
