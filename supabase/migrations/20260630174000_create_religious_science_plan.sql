create or replace function public.create_religious_science_plan(
  p_student_id uuid,
  p_catalog_slug text,
  p_start_date date,
  p_duration_days integer,
  p_achievement_points integer default 10,
  p_reward_points integer default 0,
  p_notes text default null,
  p_create_goal boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_catalog public.religious_science_catalog%rowtype;
  v_plan_id uuid;
  v_goal_id uuid;
  v_total_units integer;
  v_duration integer;
  v_scheduled_days integer;
  v_base_size integer;
  v_extra_days integer;
  v_day integer;
  v_from_row integer := 1;
  v_to_row integer;
  v_segment_size integer;
  v_due_date date;
  v_text text;
  v_first_unit integer;
  v_last_unit integer;
  v_chapter_title text;
  v_reviewer_type text;
  v_is_owner boolean;
  v_is_teacher boolean;
begin
  select s.organization_id into v_org_id
  from public.students s
  where s.id = p_student_id;

  v_is_owner := v_org_id is not null and public.is_organization_owner(v_org_id);
  v_is_teacher := public.is_active_teacher_for_student(p_student_id);

  if v_org_id is null or not (v_is_owner or v_is_teacher) then
    raise exception 'غير مصرح لك بإنشاء برنامج لهذا الطفل';
  end if;

  select * into v_catalog
  from public.religious_science_catalog c
  where c.slug = p_catalog_slug and c.is_active = true;

  if v_catalog.id is null then
    raise exception 'المتن غير متاح حاليًا';
  end if;

  select count(*)::integer into v_total_units
  from public.religious_science_units u
  where u.catalog_id = v_catalog.id;

  if coalesce(v_total_units, 0) = 0 then
    raise exception 'لا يحتوي المتن على وحدات جاهزة للحفظ';
  end if;

  v_duration := greatest(coalesce(p_duration_days, 30), 1);
  v_scheduled_days := least(v_duration, v_total_units);
  v_base_size := floor(v_total_units::numeric / v_scheduled_days)::integer;
  v_extra_days := mod(v_total_units, v_scheduled_days);
  v_due_date := coalesce(p_start_date, current_date) + (v_duration - 1);
  v_reviewer_type := case when v_is_teacher then 'teacher' else 'family' end;

  if coalesce(p_create_goal, true) then
    insert into public.goals(
      organization_id, student_id, title, description, category,
      target_points, due_date, status, created_by, goal_type,
      start_date, progress
    ) values (
      v_org_id,
      p_student_id,
      'حفظ ' || v_catalog.short_title,
      coalesce(nullif(trim(p_notes), ''), 'برنامج متدرج لحفظ ' || v_catalog.title),
      'religious_sciences',
      greatest(coalesce(p_achievement_points, 10), 0) * v_scheduled_days,
      v_due_date,
      'active',
      auth.uid(),
      'educational',
      coalesce(p_start_date, current_date),
      0
    ) returning id into v_goal_id;
  end if;

  insert into public.quran_plans(
    organization_id, student_id, title, plan_type, assigned_by,
    start_date, due_date, daily_target, status, reviewer_type,
    source_name, source_version, duration_days, content_kind,
    subject_category, catalog_item_id, goal_id
  ) values (
    v_org_id,
    p_student_id,
    'برنامج حفظ ' || v_catalog.short_title,
    'religious_science',
    auth.uid(),
    coalesce(p_start_date, current_date),
    v_due_date,
    ceil(v_total_units::numeric / v_scheduled_days)::integer,
    'active',
    v_reviewer_type,
    coalesce(v_catalog.source_name, 'مكتبة واعي كيدز'),
    '1.0',
    v_duration,
    'matn',
    v_catalog.science_category,
    v_catalog.id,
    v_goal_id
  ) returning id into v_plan_id;

  for v_day in 1..v_scheduled_days loop
    v_segment_size := v_base_size + case when v_day <= v_extra_days then 1 else 0 end;
    v_to_row := v_from_row + v_segment_size - 1;

    with ordered as (
      select u.*, row_number() over(order by u.sort_order, u.unit_number) as rn
      from public.religious_science_units u
      where u.catalog_id = v_catalog.id
    )
    select
      string_agg(o.full_text, E'\n' order by o.rn),
      min(o.unit_number),
      max(o.unit_number),
      case when count(distinct ch.title) = 1 then max(ch.title) else 'مقاطع مختارة من المتن' end
    into v_text, v_first_unit, v_last_unit, v_chapter_title
    from ordered o
    left join public.religious_science_chapters ch on ch.id = o.chapter_id
    where o.rn between v_from_row and v_to_row;

    insert into public.quran_segments(
      plan_id, surah_number, portion_label, uthmani_text, readable_text,
      status, achievement_points, reward_points, notes,
      scheduled_date, day_number, catalog_unit_from,
      catalog_unit_to, chapter_title
    ) values (
      v_plan_id,
      null,
      'اليوم ' || v_day || ' — ' || coalesce(v_chapter_title, v_catalog.short_title) || ' — ' ||
      case when v_first_unit = v_last_unit then 'البيت ' || v_first_unit else 'الأبيات ' || v_first_unit || '–' || v_last_unit end,
      v_text,
      v_text,
      'assigned',
      greatest(coalesce(p_achievement_points, 10), 0),
      greatest(coalesce(p_reward_points, 0), 0),
      nullif(trim(p_notes), ''),
      coalesce(p_start_date, current_date) + (v_day - 1),
      v_day,
      v_first_unit,
      v_last_unit,
      v_chapter_title
    );

    v_from_row := v_to_row + 1;
  end loop;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'goal_id', v_goal_id,
    'catalog_title', v_catalog.title,
    'total_units', v_total_units,
    'duration_days', v_duration,
    'scheduled_days', v_scheduled_days,
    'daily_min', v_base_size,
    'daily_max', v_base_size + case when v_extra_days > 0 then 1 else 0 end,
    'due_date', v_due_date
  );
end;
$$;

grant execute on function public.create_religious_science_plan(uuid,text,date,integer,integer,integer,text,boolean) to authenticated;
revoke all on function public.create_religious_science_plan(uuid,text,date,integer,integer,integer,text,boolean) from anon;
