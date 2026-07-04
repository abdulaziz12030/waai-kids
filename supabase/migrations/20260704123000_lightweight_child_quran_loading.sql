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
    and cs.revoked_at is null
    and cs.expires_at > now();

  if v_student_id is null then
    raise exception 'جلسة غير صالحة';
  end if;

  update public.child_sessions
  set last_seen_at = now()
  where session_token = p_session_token;

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
        'uthmani_text', null,
        'readable_text', null,
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
        'has_audio', qa.segment_id is not null,
        'audio_submitted_at', qa.submitted_at,
        'audio_duration_seconds', qa.duration_seconds
      ) order by qs.scheduled_date nulls last, qs.day_number nulls last, qs.created_at asc)
      from public.quran_segments qs
      join public.quran_plans qp on qp.id = qs.plan_id
      left join public.quran_audio_submissions qa on qa.segment_id = qs.id
      where qp.student_id = v_student_id
    ), '[]'::jsonb),
    'religious_content', '[]'::jsonb
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.get_child_quran_program(
  p_session_token uuid,
  p_plan_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_student_id uuid;
  v_plan public.quran_plans%rowtype;
  v_result jsonb;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.revoked_at is null
    and cs.expires_at > now();

  if v_student_id is null then
    raise exception 'جلسة غير صالحة';
  end if;

  select qp.* into v_plan
  from public.quran_plans qp
  where qp.id = p_plan_id
    and qp.student_id = v_student_id;

  if v_plan.id is null then
    raise exception 'البرنامج غير متاح';
  end if;

  update public.child_sessions
  set last_seen_at = now()
  where session_token = p_session_token;

  select jsonb_build_object(
    'plans', jsonb_build_array(jsonb_build_object(
      'id', v_plan.id,
      'title', v_plan.title,
      'status', v_plan.status,
      'daily_target', v_plan.daily_target,
      'start_date', v_plan.start_date,
      'due_date', v_plan.due_date,
      'surah_number', v_plan.surah_number,
      'duration_days', v_plan.duration_days,
      'content_kind', v_plan.content_kind,
      'subject_category', v_plan.subject_category,
      'catalog_item_id', v_plan.catalog_item_id,
      'source_name', v_plan.source_name
    )),
    'segments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qs.id,
        'plan_id', qs.plan_id,
        'portion_label', qs.portion_label,
        'uthmani_text', null,
        'readable_text', null,
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
        'has_audio', qa.segment_id is not null,
        'audio_submitted_at', qa.submitted_at,
        'audio_duration_seconds', qa.duration_seconds
      ) order by qs.scheduled_date nulls last, qs.day_number nulls last, qs.created_at asc)
      from public.quran_segments qs
      left join public.quran_audio_submissions qa on qa.segment_id = qs.id
      where qs.plan_id = v_plan.id
    ), '[]'::jsonb),
    'religious_content', case
      when v_plan.content_kind = 'matn' and v_plan.catalog_item_id is not null then coalesce((
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
        ))
        from public.religious_science_catalog c
        where c.id = v_plan.catalog_item_id
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.get_child_quran_segment_content(
  p_session_token uuid,
  p_segment_id uuid
)
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
    and cs.revoked_at is null
    and cs.expires_at > now();

  if v_student_id is null then
    raise exception 'جلسة غير صالحة';
  end if;

  select jsonb_build_object(
    'id', qs.id,
    'uthmani_text', qs.uthmani_text,
    'readable_text', qs.readable_text
  ) into v_result
  from public.quran_segments qs
  join public.quran_plans qp on qp.id = qs.plan_id
  where qs.id = p_segment_id
    and qp.student_id = v_student_id;

  if v_result is null then
    raise exception 'المقطع غير متاح';
  end if;

  return v_result;
end;
$function$;

grant execute on function public.get_child_quran_dashboard(uuid) to authenticated, anon;
grant execute on function public.get_child_quran_program(uuid, uuid) to authenticated, anon;
grant execute on function public.get_child_quran_segment_content(uuid, uuid) to authenticated, anon;
