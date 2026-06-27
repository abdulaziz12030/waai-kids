alter table public.rewards
  add column if not exists granted_at timestamptz,
  add column if not exists granted_by uuid references auth.users(id) on delete set null,
  add column if not exists grant_note text;

create unique index if not exists rewards_goal_id_unique on public.rewards(goal_id);

create or replace function public.child_submit_task(
  p_session_token uuid,
  p_task_id uuid,
  p_child_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_task public.tasks%rowtype;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.expires_at > now()
    and cs.revoked_at is null;

  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;

  select t.* into v_task
  from public.tasks t
  where t.id = p_task_id and t.student_id = v_student_id;

  if v_task.id is null then raise exception 'المهمة غير موجودة'; end if;
  if v_task.status not in ('pending', 'rejected') then raise exception 'لا يمكن إرسال هذه المهمة'; end if;
  if v_task.starts_on is not null and v_task.starts_on > current_date then raise exception 'لم يحن وقت هذه المهمة بعد'; end if;

  if v_task.generated_from_goal
     and v_task.plan_batch_id is not null
     and coalesce(v_task.plan_step, 1) > 1
     and exists (
       select 1 from public.tasks previous_task
       where previous_task.plan_batch_id = v_task.plan_batch_id
         and previous_task.plan_step < v_task.plan_step
         and previous_task.status <> 'approved'
     ) then
    raise exception 'أكمل المرحلة السابقة واعتمدها ولي الأمر أولًا';
  end if;

  update public.tasks
  set status = 'submitted',
      child_note = nullif(trim(p_child_note), ''),
      submitted_at = now(),
      updated_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.review_child_task(
  p_task_id uuid,
  p_decision text,
  p_review_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_goal public.goals%rowtype;
  v_total_tasks integer;
  v_approved_tasks integer;
  v_progress integer;
begin
  select t.* into v_task from public.tasks t where t.id = p_task_id;

  if v_task.id is null then raise exception 'المهمة غير موجودة'; end if;
  if not public.is_organization_owner(v_task.organization_id) then raise exception 'غير مصرح لك بتنفيذ العملية'; end if;
  if v_task.status <> 'submitted' then raise exception 'المهمة ليست بانتظار المراجعة'; end if;

  if p_decision = 'approved' then
    update public.tasks
    set status = 'approved', approved_by = auth.uid(), approved_at = now(),
        review_note = nullif(trim(p_review_note), ''), updated_at = now()
    where id = p_task_id;

    if v_task.achievement_points > 0 then
      insert into public.points_ledger(
        organization_id, student_id, source_type, source_id,
        point_type, points, note, created_by
      ) values (
        v_task.organization_id, v_task.student_id, 'task', v_task.id,
        'achievement', v_task.achievement_points,
        coalesce(nullif(trim(p_review_note), ''), v_task.title), auth.uid()
      ) on conflict do nothing;
    end if;

    if v_task.reward_points > 0 then
      insert into public.points_ledger(
        organization_id, student_id, source_type, source_id,
        point_type, points, note, created_by
      ) values (
        v_task.organization_id, v_task.student_id, 'task', v_task.id,
        'reward', v_task.reward_points,
        coalesce(nullif(trim(p_review_note), ''), v_task.title), auth.uid()
      ) on conflict do nothing;
    end if;

    update public.students s
    set achievement_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
        reward_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'reward'), 0),
        points_balance = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
        updated_at = now()
    where s.id = v_task.student_id;

    if v_task.goal_id is not null then
      select g.* into v_goal from public.goals g where g.id = v_task.goal_id;

      select count(*), count(*) filter (where t.status = 'approved')
      into v_total_tasks, v_approved_tasks
      from public.tasks t
      where t.goal_id = v_task.goal_id;

      if v_total_tasks > 0 then
        v_progress := floor((v_approved_tasks::numeric / v_total_tasks::numeric) * 100)::integer;
      else
        v_progress := 0;
      end if;

      update public.goals
      set progress = greatest(0, least(100, coalesce(v_progress, 0))),
          status = case when v_total_tasks > 0 and v_approved_tasks = v_total_tasks then 'completed'::goal_status else status end,
          updated_at = now()
      where id = v_task.goal_id;

      if v_total_tasks > 0 and v_approved_tasks = v_total_tasks then
        insert into public.rewards(
          organization_id, goal_id, student_id, title, reward_type,
          amount, points_required, status, due_date, created_by
        ) values (
          v_goal.organization_id, v_goal.id, v_goal.student_id,
          coalesce(nullif(trim(v_goal.title), ''), 'مكافأة إكمال الهدف'),
          'goal_reward', v_goal.target_value, v_goal.required_points,
          'due', current_date, auth.uid()
        )
        on conflict (goal_id) do update
        set status = case when public.rewards.status = 'paid' then public.rewards.status else 'due'::reward_status end,
            amount = excluded.amount,
            points_required = excluded.points_required,
            due_date = excluded.due_date,
            updated_at = now();
      end if;
    end if;
  elsif p_decision = 'rejected' then
    update public.tasks
    set status = 'rejected', approved_by = auth.uid(), approved_at = now(),
        review_note = nullif(trim(p_review_note), ''), updated_at = now()
    where id = p_task_id;
  else
    raise exception 'قرار المراجعة غير صحيح';
  end if;
end;
$$;

create or replace function public.grant_goal_reward(
  p_goal_id uuid,
  p_paid_amount numeric default null,
  p_grant_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_reward_id uuid;
  v_amount numeric;
begin
  select g.* into v_goal from public.goals g where g.id = p_goal_id for update;

  if v_goal.id is null then raise exception 'الهدف غير موجود'; end if;
  if not public.is_organization_owner(v_goal.organization_id) then raise exception 'غير مصرح لك بمنح هذه المكافأة'; end if;
  if v_goal.status <> 'completed' then raise exception 'لم تكتمل جميع مهام الهدف بعد'; end if;
  if exists (select 1 from public.tasks t where t.goal_id = p_goal_id and t.status <> 'approved') then raise exception 'لا تزال هناك مهام غير معتمدة'; end if;

  v_amount := greatest(coalesce(p_paid_amount, v_goal.target_value, 0), 0);

  insert into public.rewards(
    organization_id, goal_id, student_id, title, reward_type,
    amount, points_required, status, due_date, paid_amount,
    created_by, granted_at, granted_by, grant_note
  ) values (
    v_goal.organization_id, v_goal.id, v_goal.student_id,
    coalesce(nullif(trim(v_goal.title), ''), 'مكافأة إكمال الهدف'),
    'goal_reward', v_goal.target_value, v_goal.required_points,
    'paid', current_date, v_amount, auth.uid(), now(), auth.uid(),
    nullif(trim(p_grant_note), '')
  )
  on conflict (goal_id) do update
  set status = 'paid',
      paid_amount = excluded.paid_amount,
      granted_at = excluded.granted_at,
      granted_by = excluded.granted_by,
      grant_note = excluded.grant_note,
      updated_at = now()
  returning id into v_reward_id;

  return jsonb_build_object('goal_id', p_goal_id, 'reward_id', v_reward_id, 'status', 'paid', 'paid_amount', v_amount, 'granted_at', now());
end;
$$;

create or replace function public.get_parent_child_tasks_v2(p_student_id uuid)
returns table(
  id uuid,
  goal_id uuid,
  goal_title text,
  title text,
  description text,
  category text,
  difficulty text,
  points integer,
  achievement_points integer,
  reward_points integer,
  points_mode text,
  status text,
  starts_on date,
  due_date date,
  plan_step integer,
  plan_total integer,
  generated_from_goal boolean,
  child_note text,
  review_note text,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.goal_id, g.title as goal_title, t.title, t.description,
    t.category, t.difficulty, t.points, t.achievement_points,
    t.reward_points, t.points_mode, t.status::text, t.starts_on,
    t.due_date, t.plan_step, t.plan_total, t.generated_from_goal,
    t.child_note, t.review_note, t.submitted_at, t.approved_at, t.created_at
  from public.tasks t
  join public.students s on s.id = t.student_id
  left join public.goals g on g.id = t.goal_id
  where t.student_id = p_student_id
    and public.is_organization_owner(s.organization_id)
  order by
    case when t.status = 'submitted' then 0 when t.status in ('pending','rejected') then 1 else 2 end,
    t.starts_on asc nulls first,
    t.plan_step asc nulls first,
    t.created_at desc;
$$;

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
      'id', s.id, 'full_name', s.full_name,
      'achievement_points', s.achievement_points,
      'reward_points', s.reward_points,
      'level', public.get_student_level(s.achievement_points),
      'profile_data', s.profile_data
    ),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'title', g.title, 'description', g.description,
        'goal_type', g.goal_type, 'status', g.status, 'progress', g.progress,
        'required_points', g.required_points, 'target_value', g.target_value,
        'start_date', g.start_date, 'due_date', g.due_date,
        'decision_note', g.decision_note, 'decided_at', g.decided_at,
        'task_plan_mode', g.task_plan_mode, 'task_plan_count', g.task_plan_count,
        'reward_status', r.status, 'reward_paid_amount', r.paid_amount,
        'reward_granted_at', r.granted_at, 'reward_grant_note', r.grant_note
      ) order by g.created_at desc)
      from public.goals g
      left join public.rewards r on r.goal_id = g.id
      where g.student_id = s.id
        and g.status::text in ('pending','requested','approved','active','paused','completed','rejected')
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'goal_id', t.goal_id, 'title', t.title,
        'description', t.description, 'category', t.category,
        'difficulty', t.difficulty, 'achievement_points', t.achievement_points,
        'reward_points', t.reward_points, 'status', t.status,
        'starts_on', t.starts_on, 'due_date', t.due_date,
        'plan_step', t.plan_step, 'plan_total', t.plan_total,
        'generated_from_goal', t.generated_from_goal,
        'child_note', t.child_note, 'review_note', t.review_note,
        'submitted_at', t.submitted_at
      ) order by
        case when t.status::text in ('pending','rejected') then 0 when t.status::text = 'submitted' then 1 else 2 end,
        t.starts_on asc nulls first,
        t.plan_step asc nulls first,
        t.created_at desc)
      from public.tasks t where t.student_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.students s where s.id = v_student_id;

  return v_result;
end;
$$;

do $migration$
begin
  execute 'revoke execute on function public.grant_goal_reward(uuid, numeric, text) from public';
  execute 'revoke execute on function public.grant_goal_reward(uuid, numeric, text) from anon';
  execute 'grant execute on function public.grant_goal_reward(uuid, numeric, text) to authenticated';
  execute 'revoke execute on function public.get_parent_child_tasks_v2(uuid) from public';
  execute 'revoke execute on function public.get_parent_child_tasks_v2(uuid) from anon';
  execute 'grant execute on function public.get_parent_child_tasks_v2(uuid) to authenticated';
end
$migration$;
