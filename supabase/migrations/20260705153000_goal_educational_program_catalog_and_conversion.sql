create or replace function public.get_educational_program_catalog()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with programs as (
    select
      1 as sort_order,
      'multiplication-adventure'::text as program_key,
      'multiplication'::text as program_type,
      null::text as source_slug,
      'مغامرة أبطال جدول الضرب'::text as title,
      'جدول الضرب'::text as short_title,
      'بطاقات تعلم وتحديات متدرجة حتى إتقان الجداول.'::text as description,
      '✖️'::text as icon,
      12::integer as units_count,
      null::text as subject_category
    union all
    select
      100 + c.sort_order,
      'religious:' || c.slug,
      'religious_science',
      c.slug,
      c.title,
      c.short_title,
      coalesce(c.description, 'برنامج متدرج لحفظ المتن وتقسيمه على المدة المحددة.'),
      '📜',
      (select count(*)::integer from public.religious_science_units u where u.catalog_id = c.id),
      c.science_category
    from public.religious_science_catalog c
    where c.is_active = true
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'program_key', p.program_key,
    'program_type', p.program_type,
    'source_slug', p.source_slug,
    'title', p.title,
    'short_title', p.short_title,
    'description', p.description,
    'icon', p.icon,
    'units_count', p.units_count,
    'subject_category', p.subject_category
  ) order by p.sort_order, p.title), '[]'::jsonb)
  from programs p
$$;

grant execute on function public.get_educational_program_catalog() to authenticated;
revoke all on function public.get_educational_program_catalog() from anon;

create or replace function public.convert_goal_to_multiplication_program(
  p_goal_id uuid,
  p_from_table integer default 1,
  p_to_table integer default 10,
  p_questions_per_stage integer default 10,
  p_pass_percentage integer default 80,
  p_achievement_points integer default 100,
  p_reward_points integer default 10,
  p_start_date date default current_date,
  p_due_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_student public.students%rowtype;
  v_task_id uuid;
  v_program_id uuid;
  v_role text;
  v_table integer;
  v_stage_count integer;
begin
  select * into v_goal from public.goals where id = p_goal_id for update;
  if v_goal.id is null then raise exception 'الهدف غير موجود'; end if;

  select * into v_student from public.students where id = v_goal.student_id;
  if v_student.id is null or not public.can_manage_student_learning(v_goal.student_id) then
    raise exception 'غير مصرح لك بتحويل هذا الهدف';
  end if;

  if exists(select 1 from public.tasks t where t.goal_id = p_goal_id)
     or exists(select 1 from public.quran_plans qp where qp.goal_id = p_goal_id) then
    raise exception 'يوجد مهام مرتبطة بهذا الهدف';
  end if;

  if p_from_table < 1 or p_to_table > 12 or p_from_table > p_to_table then
    raise exception 'نطاق الجداول غير صحيح';
  end if;
  if p_questions_per_stage < 5 or p_questions_per_stage > 10 then
    raise exception 'عدد الأسئلة يجب أن يكون بين 5 و10';
  end if;
  if p_pass_percentage < 50 or p_pass_percentage > 100 then
    raise exception 'نسبة النجاح غير صحيحة';
  end if;
  if p_due_date is not null and p_due_date < coalesce(p_start_date, current_date) then
    raise exception 'تاريخ الاستحقاق غير صحيح';
  end if;

  v_role := case when public.is_organization_owner(v_student.organization_id) then 'parent' else 'teacher' end;
  v_stage_count := p_to_table - p_from_table + 1;

  insert into public.tasks(
    organization_id, goal_id, student_id, title, description, category, difficulty,
    points, achievement_points, reward_points, points_mode, status,
    starts_on, due_date, assigned_by, recurrence, generated_from_goal,
    plan_step, plan_total
  ) values (
    v_student.organization_id,
    p_goal_id,
    v_goal.student_id,
    'مغامرة أبطال جدول الضرب',
    coalesce(nullif(trim(p_notes), ''), format('إتقان جداول الضرب من %s إلى %s عبر بطاقات تعلم وتحديات تفاعلية.', p_from_table, p_to_table)),
    'educational',
    'major',
    greatest(coalesce(p_achievement_points, 0), 0) + greatest(coalesce(p_reward_points, 0), 0),
    greatest(coalesce(p_achievement_points, 0), 0),
    greatest(coalesce(p_reward_points, 0), 0),
    'manual',
    'pending',
    coalesce(p_start_date, current_date),
    p_due_date,
    auth.uid(),
    'once',
    true,
    1,
    1
  ) returning id into v_task_id;

  insert into public.multiplication_programs(
    organization_id, task_id, student_id, assigned_by, assigned_role,
    from_table, to_table, questions_per_stage, pass_percentage, current_table
  ) values (
    v_student.organization_id, v_task_id, v_goal.student_id, auth.uid(), v_role,
    p_from_table, p_to_table, p_questions_per_stage, p_pass_percentage, p_from_table
  ) returning id into v_program_id;

  for v_table in p_from_table..p_to_table loop
    insert into public.multiplication_stage_progress(program_id, table_number, status)
    values (v_program_id, v_table, case when v_table = p_from_table then 'available' else 'locked' end);
  end loop;

  update public.goals
  set status = 'active',
      goal_type = 'educational',
      category = 'educational',
      start_date = coalesce(p_start_date, current_date),
      due_date = p_due_date,
      approved_by = coalesce(approved_by, auth.uid()),
      approved_at = coalesce(approved_at, now()),
      decided_by = auth.uid(),
      decided_at = now(),
      converted_to_tasks_at = now(),
      task_plan_mode = 'برنامج جدول الضرب',
      task_plan_count = 1,
      decision_note = coalesce(nullif(trim(p_notes), ''), decision_note),
      updated_at = now()
  where id = p_goal_id;

  insert into public.child_notifications(
    organization_id, student_id, notification_type, title, body, icon,
    action_type, action_id, source_key, metadata
  ) values (
    v_student.organization_id,
    v_goal.student_id,
    'task_assigned',
    'مغامرة جديدة في جدول الضرب',
    format('ابدأ من جدول %s وتقدم حتى جدول %s لتصبح بطل جدول الضرب.', p_from_table, p_to_table),
    '✖️',
    'multiplication_program',
    v_program_id,
    'multiplication-goal-assigned:' || v_program_id::text,
    jsonb_build_object('program_id', v_program_id, 'task_id', v_task_id, 'goal_id', p_goal_id)
  ) on conflict (source_key) do nothing;

  return jsonb_build_object(
    'program_id', v_program_id,
    'task_id', v_task_id,
    'goal_id', p_goal_id,
    'stage_count', v_stage_count
  );
end;
$$;

grant execute on function public.convert_goal_to_multiplication_program(uuid,integer,integer,integer,integer,integer,integer,date,date,text) to authenticated;
revoke all on function public.convert_goal_to_multiplication_program(uuid,integer,integer,integer,integer,integer,integer,date,date,text) from anon;

create or replace function public.convert_goal_to_religious_science_program(
  p_goal_id uuid,
  p_catalog_slug text,
  p_start_date date,
  p_duration_days integer,
  p_achievement_points integer default 10,
  p_reward_points integer default 0,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_catalog public.religious_science_catalog%rowtype;
  v_plan_id uuid;
  v_total_units integer;
  v_duration integer;
  v_max_segments integer;
  v_scheduled_days integer;
  v_base_size integer;
  v_extra_days integer;
  v_day integer;
  v_from_row integer := 1;
  v_to_row integer;
  v_segment_size integer;
  v_schedule_offset integer;
  v_due_date date;
  v_text text;
  v_first_unit integer;
  v_last_unit integer;
  v_chapter_title text;
  v_reviewer_type text;
begin
  select * into v_goal from public.goals where id = p_goal_id for update;
  if v_goal.id is null then raise exception 'الهدف غير موجود'; end if;
  if not public.can_manage_student_learning(v_goal.student_id) then
    raise exception 'غير مصرح لك بتحويل هذا الهدف';
  end if;

  if exists(select 1 from public.tasks t where t.goal_id = p_goal_id)
     or exists(select 1 from public.quran_plans qp where qp.goal_id = p_goal_id) then
    raise exception 'يوجد مهام مرتبطة بهذا الهدف';
  end if;

  select * into v_catalog
  from public.religious_science_catalog c
  where c.slug = p_catalog_slug and c.is_active = true;
  if v_catalog.id is null then raise exception 'البرنامج التعليمي غير متاح حاليًا'; end if;

  select count(*)::integer into v_total_units
  from public.religious_science_units u where u.catalog_id = v_catalog.id;
  if coalesce(v_total_units, 0) = 0 then raise exception 'لا يحتوي البرنامج على وحدات جاهزة'; end if;

  v_duration := greatest(least(coalesce(p_duration_days, 30), 365), 1);
  v_max_segments := greatest(1, floor(v_total_units::numeric / 2)::integer);
  v_scheduled_days := least(v_duration, v_max_segments);
  v_base_size := floor(v_total_units::numeric / v_scheduled_days)::integer;
  v_extra_days := mod(v_total_units, v_scheduled_days);
  v_due_date := coalesce(p_start_date, current_date) + (v_duration - 1);
  v_reviewer_type := case when public.is_organization_owner(v_goal.organization_id) then 'family' else 'teacher' end;

  insert into public.quran_plans(
    organization_id, student_id, title, plan_type, assigned_by,
    start_date, due_date, daily_target, status, reviewer_type,
    source_name, source_version, duration_days, content_kind,
    subject_category, catalog_item_id, goal_id
  ) values (
    v_goal.organization_id,
    v_goal.student_id,
    'برنامج حفظ ' || v_catalog.short_title,
    'religious_science',
    auth.uid(),
    coalesce(p_start_date, current_date),
    v_due_date,
    ceil(v_total_units::numeric / v_scheduled_days)::integer,
    'active',
    v_reviewer_type,
    coalesce(v_catalog.source_name, 'مكتبة واعي كيدز'),
    '1.2',
    v_duration,
    'matn',
    v_catalog.science_category,
    v_catalog.id,
    p_goal_id
  ) returning id into v_plan_id;

  for v_day in 1..v_scheduled_days loop
    v_segment_size := v_base_size + case when v_day <= v_extra_days then 1 else 0 end;
    v_to_row := v_from_row + v_segment_size - 1;
    v_schedule_offset := case
      when v_scheduled_days = 1 then 0
      else floor(((v_day - 1) * (v_duration - 1))::numeric / (v_scheduled_days - 1))::integer
    end;

    with ordered as (
      select u.*, row_number() over(order by u.sort_order, u.unit_number) as rn
      from public.religious_science_units u where u.catalog_id = v_catalog.id
    )
    select string_agg(o.full_text, E'\n\n' order by o.rn), min(o.unit_number), max(o.unit_number),
      case when count(distinct ch.title) = 1 then max(ch.title) else 'بين قسمين من المنظومة' end
    into v_text, v_first_unit, v_last_unit, v_chapter_title
    from ordered o
    left join public.religious_science_chapters ch on ch.id = o.chapter_id
    where o.rn between v_from_row and v_to_row;

    insert into public.quran_segments(
      plan_id, surah_number, portion_label, uthmani_text, readable_text,
      status, achievement_points, reward_points, notes, scheduled_date,
      day_number, catalog_unit_from, catalog_unit_to, chapter_title
    ) values (
      v_plan_id,
      null,
      'المقطع ' || v_day || ' — ' || coalesce(v_chapter_title, v_catalog.short_title) || ' — ' ||
      case when v_first_unit = v_last_unit then 'البيت ' || v_first_unit else 'الأبيات ' || v_first_unit || '–' || v_last_unit end,
      v_text,
      v_text,
      'assigned',
      greatest(coalesce(p_achievement_points, 10), 0),
      greatest(coalesce(p_reward_points, 0), 0),
      nullif(trim(p_notes), ''),
      coalesce(p_start_date, current_date) + v_schedule_offset,
      v_day,
      v_first_unit,
      v_last_unit,
      v_chapter_title
    );
    v_from_row := v_to_row + 1;
  end loop;

  update public.goals
  set status = 'active',
      goal_type = 'educational',
      category = 'religious_sciences',
      start_date = coalesce(p_start_date, current_date),
      due_date = v_due_date,
      target_points = greatest(coalesce(p_achievement_points, 10), 0) * v_scheduled_days,
      approved_by = coalesce(approved_by, auth.uid()),
      approved_at = coalesce(approved_at, now()),
      decided_by = auth.uid(),
      decided_at = now(),
      converted_to_tasks_at = now(),
      task_plan_mode = 'برنامج ' || v_catalog.short_title,
      task_plan_count = v_scheduled_days,
      decision_note = coalesce(nullif(trim(p_notes), ''), decision_note),
      updated_at = now()
  where id = p_goal_id;

  insert into public.child_notifications(
    organization_id, student_id, notification_type, title, body, icon,
    action_type, action_id, source_key, metadata
  ) values (
    v_goal.organization_id,
    v_goal.student_id,
    'task_assigned',
    'برنامج تعليمي جديد',
    'تم إسناد برنامج ' || v_catalog.short_title || ' وتقسيمه إلى ' || v_scheduled_days || ' مقاطع.',
    '📜',
    'quran_plan',
    v_plan_id,
    'religious-goal-assigned:' || v_plan_id::text,
    jsonb_build_object('plan_id', v_plan_id, 'goal_id', p_goal_id, 'catalog_slug', v_catalog.slug)
  ) on conflict (source_key) do nothing;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'goal_id', p_goal_id,
    'catalog_title', v_catalog.title,
    'scheduled_days', v_scheduled_days,
    'total_units', v_total_units,
    'due_date', v_due_date
  );
end;
$$;

grant execute on function public.convert_goal_to_religious_science_program(uuid,text,date,integer,integer,integer,text) to authenticated;
revoke all on function public.convert_goal_to_religious_science_program(uuid,text,date,integer,integer,integer,text) from anon;
