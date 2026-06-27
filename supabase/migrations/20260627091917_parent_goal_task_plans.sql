alter table public.goals
  add column if not exists decision_note text,
  add column if not exists decided_by uuid references auth.users(id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists converted_to_tasks_at timestamptz,
  add column if not exists task_plan_mode text,
  add column if not exists task_plan_count integer not null default 0;

alter table public.tasks
  add column if not exists starts_on date,
  add column if not exists plan_batch_id uuid,
  add column if not exists plan_step integer,
  add column if not exists plan_total integer,
  add column if not exists generated_from_goal boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'goals_task_plan_count_nonnegative' and conrelid = 'public.goals'::regclass) then
    alter table public.goals add constraint goals_task_plan_count_nonnegative check (task_plan_count >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_plan_step_valid' and conrelid = 'public.tasks'::regclass) then
    alter table public.tasks add constraint tasks_plan_step_valid check ((plan_step is null and plan_total is null) or (plan_step >= 1 and plan_total >= 1 and plan_step <= plan_total));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_plan_dates_valid' and conrelid = 'public.tasks'::regclass) then
    alter table public.tasks add constraint tasks_plan_dates_valid check (starts_on is null or due_date is null or due_date >= starts_on);
  end if;
end $$;

create index if not exists goals_student_status_idx on public.goals(student_id, status);
create index if not exists tasks_plan_batch_idx on public.tasks(plan_batch_id) where plan_batch_id is not null;
create index if not exists tasks_goal_due_idx on public.tasks(goal_id, due_date) where goal_id is not null;

create or replace function public.review_child_goal(
  p_goal_id uuid,
  p_decision text,
  p_review_note text default null,
  p_start_date date default null,
  p_due_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_decision text := lower(coalesce(trim(p_decision), ''));
  v_start_date date;
  v_due_date date;
begin
  select g.* into v_goal from public.goals g where g.id = p_goal_id for update;
  if v_goal.id is null then raise exception 'الهدف غير موجود'; end if;
  if not public.is_organization_owner(v_goal.organization_id) then raise exception 'غير مصرح لك بمراجعة هذا الهدف'; end if;
  if v_decision not in ('approved', 'rejected') then raise exception 'قرار الهدف غير صحيح'; end if;

  if v_decision = 'approved' then
    v_start_date := coalesce(p_start_date, v_goal.start_date, current_date);
    v_due_date := coalesce(p_due_date, v_goal.due_date);
    if v_due_date is null then raise exception 'حدد تاريخ استحقاق الهدف قبل الموافقة'; end if;
    if v_due_date < v_start_date then raise exception 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ البداية'; end if;

    update public.goals
    set status = 'approved', start_date = v_start_date, due_date = v_due_date,
        approved_by = auth.uid(), approved_at = now(), decided_by = auth.uid(), decided_at = now(),
        decision_note = nullif(trim(p_review_note), ''), updated_at = now()
    where id = p_goal_id;
  else
    update public.goals
    set status = 'rejected', approved_by = null, approved_at = null,
        decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_review_note), ''), updated_at = now()
    where id = p_goal_id;
  end if;

  return jsonb_build_object('goal_id', p_goal_id, 'status', v_decision, 'start_date', v_start_date, 'due_date', v_due_date);
end;
$$;

create or replace function public.convert_goal_to_task_plan(
  p_goal_id uuid,
  p_start_date date,
  p_due_date date,
  p_split_mode text default 'weekly',
  p_installments integer default 4,
  p_title_prefix text default null,
  p_category text default 'other',
  p_difficulty text default 'medium',
  p_points_mode text default 'automatic',
  p_achievement_points integer default 10,
  p_reward_points integer default 1,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_mode text := lower(coalesce(trim(p_split_mode), 'weekly'));
  v_days integer;
  v_count integer;
  v_step integer;
  v_period_start date;
  v_period_due date;
  v_batch_id uuid := gen_random_uuid();
  v_title_base text;
  v_task_title text;
  v_achievement integer;
  v_reward integer;
  v_points_mode text := lower(coalesce(trim(p_points_mode), 'automatic'));
begin
  select g.* into v_goal from public.goals g where g.id = p_goal_id for update;
  if v_goal.id is null then raise exception 'الهدف غير موجود'; end if;
  if not public.is_organization_owner(v_goal.organization_id) then raise exception 'غير مصرح لك بتحويل هذا الهدف'; end if;
  if v_goal.status::text not in ('pending', 'requested', 'approved', 'paused') then raise exception 'حالة الهدف لا تسمح بتحويله إلى مهام'; end if;
  if p_start_date is null or p_due_date is null then raise exception 'حدد تاريخ البداية وتاريخ الاستحقاق'; end if;
  if p_due_date < p_start_date then raise exception 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ البداية'; end if;

  v_days := (p_due_date - p_start_date) + 1;
  if v_days > 366 then raise exception 'المدة القصوى للخطة سنة واحدة'; end if;
  if exists (select 1 from public.tasks t where t.goal_id = p_goal_id) then raise exception 'يوجد مهام مرتبطة بهذا الهدف بالفعل'; end if;

  if v_mode = 'single' then
    v_count := 1;
  elsif v_mode = 'daily' then
    if v_days > 90 then raise exception 'التجزئة اليومية متاحة لمدة لا تتجاوز 90 يومًا'; end if;
    v_count := v_days;
  elsif v_mode = 'weekly' then
    v_count := ceil(v_days::numeric / 7.0)::integer;
  elsif v_mode = 'milestones' then
    v_count := greatest(coalesce(p_installments, 0), 0);
    if v_count < 2 or v_count > 30 then raise exception 'عدد المراحل يجب أن يكون بين 2 و30'; end if;
    if v_count > v_days then raise exception 'عدد المراحل لا يمكن أن يتجاوز عدد أيام الخطة'; end if;
  else
    raise exception 'طريقة التجزئة غير صحيحة';
  end if;

  v_title_base := coalesce(nullif(trim(p_title_prefix), ''), nullif(trim(v_goal.title), ''), 'مهمة الهدف');

  if v_points_mode = 'automatic' then
    select r.achievement_points, r.reward_points into v_achievement, v_reward
    from public.point_rules r
    where r.organization_id = v_goal.organization_id
      and r.category = coalesce(nullif(trim(p_category), ''), 'other')
      and r.difficulty = coalesce(nullif(trim(p_difficulty), ''), 'medium')
      and r.is_active = true
    limit 1;
  end if;

  v_achievement := coalesce(v_achievement, greatest(coalesce(p_achievement_points, 0), 0));
  v_reward := coalesce(v_reward, greatest(coalesce(p_reward_points, 0), 0));

  for v_step in 1..v_count loop
    if v_mode = 'single' then
      v_period_start := p_start_date;
      v_period_due := p_due_date;
    elsif v_mode = 'daily' then
      v_period_start := p_start_date + (v_step - 1);
      v_period_due := v_period_start;
    elsif v_mode = 'weekly' then
      v_period_start := p_start_date + ((v_step - 1) * 7);
      v_period_due := least(v_period_start + 6, p_due_date);
    else
      v_period_start := p_start_date + floor(((v_step - 1) * v_days)::numeric / v_count)::integer;
      if v_step = v_count then
        v_period_due := p_due_date;
      else
        v_period_due := p_start_date + floor((v_step * v_days)::numeric / v_count)::integer - 1;
      end if;
      v_period_due := greatest(v_period_due, v_period_start);
    end if;

    v_task_title := case when v_count = 1 then v_title_base else format('%s — المرحلة %s من %s', v_title_base, v_step, v_count) end;

    insert into public.tasks(
      organization_id, goal_id, student_id, title, description, category, difficulty,
      points, achievement_points, reward_points, points_mode, status, starts_on, due_date,
      assigned_by, recurrence, plan_batch_id, plan_step, plan_total, generated_from_goal
    ) values (
      v_goal.organization_id, v_goal.id, v_goal.student_id, v_task_title, nullif(trim(v_goal.description), ''),
      coalesce(nullif(trim(p_category), ''), 'other'), coalesce(nullif(trim(p_difficulty), ''), 'medium'),
      v_achievement + v_reward, v_achievement, v_reward, v_points_mode, 'pending', v_period_start, v_period_due,
      auth.uid(), 'once', v_batch_id, v_step, v_count, true
    );
  end loop;

  update public.goals
  set status = 'approved', start_date = p_start_date, due_date = p_due_date,
      approved_by = auth.uid(), approved_at = now(), decided_by = auth.uid(), decided_at = now(),
      decision_note = nullif(trim(p_review_note), ''), converted_to_tasks_at = now(),
      task_plan_mode = v_mode, task_plan_count = v_count, updated_at = now()
  where id = p_goal_id;

  return jsonb_build_object('goal_id', p_goal_id, 'plan_batch_id', v_batch_id, 'task_count', v_count,
    'split_mode', v_mode, 'start_date', p_start_date, 'due_date', p_due_date);
end;
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
  where cs.session_token = p_session_token and cs.expires_at > now() and cs.revoked_at is null;
  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;

  update public.child_sessions set last_seen_at = now() where session_token = p_session_token;

  select jsonb_build_object(
    'student', jsonb_build_object(
      'id', s.id, 'full_name', s.full_name, 'achievement_points', s.achievement_points,
      'reward_points', s.reward_points, 'level', public.get_student_level(s.achievement_points), 'profile_data', s.profile_data
    ),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'title', g.title, 'description', g.description, 'goal_type', g.goal_type,
        'status', g.status, 'progress', g.progress, 'required_points', g.required_points,
        'start_date', g.start_date, 'due_date', g.due_date, 'decision_note', g.decision_note,
        'decided_at', g.decided_at, 'task_plan_mode', g.task_plan_mode, 'task_plan_count', g.task_plan_count
      ) order by g.created_at desc)
      from public.goals g
      where g.student_id = s.id and g.status::text in ('pending','requested','approved','active','paused','completed','rejected')
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'goal_id', t.goal_id, 'title', t.title, 'description', t.description,
        'category', t.category, 'difficulty', t.difficulty, 'achievement_points', t.achievement_points,
        'reward_points', t.reward_points, 'status', t.status, 'starts_on', t.starts_on,
        'due_date', t.due_date, 'plan_step', t.plan_step, 'plan_total', t.plan_total,
        'child_note', t.child_note, 'review_note', t.review_note, 'submitted_at', t.submitted_at
      ) order by
        case when t.status::text in ('pending','rejected') then 0 when t.status::text = 'submitted' then 1 else 2 end,
        t.due_date asc nulls last, t.plan_step asc nulls last, t.created_at desc)
      from public.tasks t where t.student_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.students s where s.id = v_student_id;

  return v_result;
end;
$$;
