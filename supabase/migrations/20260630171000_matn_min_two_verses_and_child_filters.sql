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
set search_path to 'public'
as $function$
declare
  v_org_id uuid;
  v_catalog public.religious_science_catalog%rowtype;
  v_plan_id uuid;
  v_goal_id uuid;
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
  v_is_owner boolean;
  v_is_teacher boolean;
begin
  select s.organization_id into v_org_id from public.students s where s.id = p_student_id;
  v_is_owner := v_org_id is not null and public.is_organization_owner(v_org_id);
  v_is_teacher := public.is_active_teacher_for_student(p_student_id);
  if v_org_id is null or not (v_is_owner or v_is_teacher) then
    raise exception 'غير مصرح لك بإنشاء برنامج لهذا الطفل';
  end if;

  select * into v_catalog from public.religious_science_catalog c
  where c.slug = p_catalog_slug and c.is_active = true;
  if v_catalog.id is null then raise exception 'المتن غير متاح حاليًا'; end if;

  select count(*)::integer into v_total_units
  from public.religious_science_units u where u.catalog_id = v_catalog.id;
  if coalesce(v_total_units, 0) = 0 then raise exception 'لا يحتوي المتن على وحدات جاهزة للحفظ'; end if;

  v_duration := greatest(least(coalesce(p_duration_days, 30), 365), 1);
  v_max_segments := greatest(1, floor(v_total_units::numeric / 2)::integer);
  v_scheduled_days := least(v_duration, v_max_segments);
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
      v_org_id, p_student_id, 'حفظ ' || v_catalog.short_title,
      coalesce(nullif(trim(p_notes), ''), 'برنامج متدرج لحفظ ' || v_catalog.title),
      'religious_sciences', greatest(coalesce(p_achievement_points, 10), 0) * v_scheduled_days,
      v_due_date, 'active', auth.uid(), 'educational', coalesce(p_start_date, current_date), 0
    ) returning id into v_goal_id;
  end if;

  insert into public.quran_plans(
    organization_id, student_id, title, plan_type, assigned_by,
    start_date, due_date, daily_target, status, reviewer_type,
    source_name, source_version, duration_days, content_kind,
    subject_category, catalog_item_id, goal_id
  ) values (
    v_org_id, p_student_id, 'برنامج حفظ ' || v_catalog.short_title,
    'religious_science', auth.uid(), coalesce(p_start_date, current_date), v_due_date,
    ceil(v_total_units::numeric / v_scheduled_days)::integer, 'active', v_reviewer_type,
    coalesce(v_catalog.source_name, 'مكتبة واعي كيدز'), '1.1', v_duration,
    'matn', v_catalog.science_category, v_catalog.id, v_goal_id
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
    from ordered o left join public.religious_science_chapters ch on ch.id = o.chapter_id
    where o.rn between v_from_row and v_to_row;

    insert into public.quran_segments(
      plan_id, surah_number, portion_label, uthmani_text, readable_text,
      status, achievement_points, reward_points, notes, scheduled_date,
      day_number, catalog_unit_from, catalog_unit_to, chapter_title
    ) values (
      v_plan_id, null,
      'المقطع ' || v_day || ' — ' || coalesce(v_chapter_title, v_catalog.short_title) || ' — ' ||
      case when v_first_unit = v_last_unit then 'البيت ' || v_first_unit else 'الأبيات ' || v_first_unit || '–' || v_last_unit end,
      v_text, v_text, 'assigned', greatest(coalesce(p_achievement_points, 10), 0),
      greatest(coalesce(p_reward_points, 0), 0), nullif(trim(p_notes), ''),
      coalesce(p_start_date, current_date) + v_schedule_offset, v_day,
      v_first_unit, v_last_unit, v_chapter_title
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
    'minimum_units_per_segment', case when v_total_units > 1 then 2 else 1 end,
    'due_date', v_due_date
  );
end;
$function$;

grant execute on function public.create_religious_science_plan(uuid,text,date,integer,integer,integer,text,boolean) to authenticated;

create or replace function public.get_child_quran_dashboard(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.revoked_at is null and cs.expires_at > now();

  if v_student_id is null then raise exception 'جلسة غير صالحة'; end if;

  update public.child_sessions set last_seen_at = now() where session_token = p_session_token;

  select jsonb_build_object(
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qp.id,
        'title', qp.title,
        'status', qp.status,
        'daily_target', qp.daily_target,
        'start_date', qp.start_date,
        'due_date', qp.due_date,
        'surah_number', qp.surah_number,
        'duration_days', qp.duration_days,
        'content_kind', qp.content_kind,
        'subject_category', qp.subject_category,
        'catalog_item_id', qp.catalog_item_id,
        'source_name', qp.source_name
      ) order by qp.created_at desc)
      from public.quran_plans qp
      where qp.student_id = v_student_id
    ), '[]'::jsonb),
    'segments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qs.id,
        'plan_id', qs.plan_id,
        'portion_label', qs.portion_label,
        'uthmani_text', qs.uthmani_text,
        'readable_text', qs.readable_text,
        'status', qs.status,
        'achievement_points', qs.achievement_points,
        'reward_points', qs.reward_points,
        'notes', qs.notes,
        'scheduled_date', qs.scheduled_date,
        'day_number', qs.day_number,
        'from_ayah', qs.from_ayah,
        'to_ayah', qs.to_ayah,
        'surah_number', qs.surah_number,
        'catalog_unit_from', qs.catalog_unit_from,
        'catalog_unit_to', qs.catalog_unit_to,
        'chapter_title', qs.chapter_title,
        'has_audio', exists(select 1 from public.quran_audio_submissions qa where qa.segment_id = qs.id),
        'audio_submitted_at', (select qa.submitted_at from public.quran_audio_submissions qa where qa.segment_id = qs.id),
        'audio_duration_seconds', (select qa.duration_seconds from public.quran_audio_submissions qa where qa.segment_id = qs.id)
      ) order by qs.scheduled_date nulls last, qs.day_number nulls last, qs.created_at asc)
      from public.quran_segments qs
      join public.quran_plans qp on qp.id = qs.plan_id
      where qp.student_id = v_student_id
    ), '[]'::jsonb),
    'religious_content', coalesce((
      select jsonb_agg(jsonb_build_object(
        'catalog_id', c.id,
        'title', c.title,
        'short_title', c.short_title,
        'author', c.author,
        'science_category', c.science_category,
        'source_name', c.source_name,
        'source_note', c.source_note,
        'chapters', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ch.id,
            'chapter_number', ch.chapter_number,
            'title', ch.title,
            'units', coalesce((
              select jsonb_agg(jsonb_build_object(
                'unit_number', u.unit_number,
                'first_part', u.first_part,
                'second_part', u.second_part,
                'full_text', u.full_text
              ) order by u.sort_order, u.unit_number)
              from public.religious_science_units u
              where u.chapter_id = ch.id
            ), '[]'::jsonb)
          ) order by ch.sort_order, ch.chapter_number)
          from public.religious_science_chapters ch
          where ch.catalog_id = c.id
        ), '[]'::jsonb)
      ) order by c.sort_order, c.title)
      from public.religious_science_catalog c
      where exists (
        select 1 from public.quran_plans qp
        where qp.student_id = v_student_id
          and qp.catalog_item_id = c.id
          and qp.content_kind = 'matn'
      )
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

grant execute on function public.get_child_quran_dashboard(uuid) to authenticated, anon;
