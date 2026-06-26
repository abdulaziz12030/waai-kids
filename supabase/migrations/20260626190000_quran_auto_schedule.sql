-- Automatic Quran memorization schedules.
-- Applied to the Namaa Supabase project on 2026-06-26.

alter table public.quran_plans
  add column if not exists surah_number integer,
  add column if not exists duration_days integer;

alter table public.quran_segments
  add column if not exists scheduled_date date,
  add column if not exists day_number integer;

create index if not exists quran_segments_plan_schedule_idx
  on public.quran_segments(plan_id, scheduled_date, day_number);

create or replace function public.create_quran_scheduled_plan(
  p_student_id uuid,
  p_title text,
  p_surah_number integer,
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
as $function$
declare
  v_org_id uuid;
  v_plan_id uuid;
  v_surah_name text;
  v_total_ayahs integer;
  v_duration integer;
  v_memorization_days integer;
  v_review_days integer;
  v_base_size integer;
  v_extra_days integer;
  v_day integer;
  v_from_ayah integer := 1;
  v_to_ayah integer;
  v_segment_size integer;
  v_due_date date;
  v_uthmani_text text;
  v_readable_text text;
  v_daily_target integer;
begin
  select s.organization_id
    into v_org_id
  from public.students s
  where s.id = p_student_id;

  if v_org_id is null or not public.is_organization_owner(v_org_id) then
    raise exception 'غير مصرح لك بتنفيذ العملية';
  end if;

  if p_surah_number not between 1 and 114 then
    raise exception 'رقم السورة غير صحيح';
  end if;

  select qa.surah_name_ar
    into v_surah_name
  from public.quran_ayahs qa
  where qa.surah_number = p_surah_number
  group by qa.surah_name_ar
  order by count(*) desc
  limit 1;

  select count(*)::integer
    into v_total_ayahs
  from public.quran_ayahs qa
  where qa.surah_number = p_surah_number;

  if coalesce(v_total_ayahs, 0) = 0 then
    raise exception 'تعذر العثور على آيات السورة';
  end if;

  v_duration := greatest(coalesce(p_duration_days, 30), 1);
  v_memorization_days := least(v_duration, v_total_ayahs);
  v_review_days := greatest(v_duration - v_memorization_days, 0);
  v_base_size := floor(v_total_ayahs::numeric / v_memorization_days)::integer;
  v_extra_days := mod(v_total_ayahs, v_memorization_days);
  v_due_date := coalesce(p_start_date, current_date) + (v_duration - 1);
  v_daily_target := ceil(v_total_ayahs::numeric / v_memorization_days)::integer;

  insert into public.quran_plans(
    organization_id, student_id, title, plan_type, assigned_by,
    start_date, due_date, daily_target, status, reviewer_type,
    source_name, surah_number, duration_days
  ) values (
    v_org_id,
    p_student_id,
    coalesce(nullif(trim(p_title), ''), 'برنامج حفظ سورة ' || v_surah_name),
    'memorization',
    auth.uid(),
    coalesce(p_start_date, current_date),
    v_due_date,
    v_daily_target,
    'active',
    'family',
    'مجمع الملك فهد لطباعة المصحف الشريف',
    p_surah_number,
    v_duration
  ) returning id into v_plan_id;

  for v_day in 1..v_memorization_days loop
    v_segment_size := v_base_size + case when v_day <= v_extra_days then 1 else 0 end;
    v_to_ayah := v_from_ayah + v_segment_size - 1;

    select
      string_agg(qa.uthmani_text, ' ' order by qa.ayah_number),
      string_agg(
        trim(coalesce(nullif(qa.search_text, ''), qa.uthmani_text)) || ' ﴿' || public.to_arabic_indic_number(qa.ayah_number) || '﴾',
        ' '
        order by qa.ayah_number
      )
    into v_uthmani_text, v_readable_text
    from public.quran_ayahs qa
    where qa.surah_number = p_surah_number
      and qa.ayah_number between v_from_ayah and v_to_ayah;

    insert into public.quran_segments(
      plan_id, surah_number, from_ayah, to_ayah,
      portion_label, uthmani_text, readable_text,
      status, achievement_points, reward_points, notes,
      scheduled_date, day_number
    ) values (
      v_plan_id,
      p_surah_number,
      v_from_ayah,
      v_to_ayah,
      'اليوم ' || v_day || ' — سورة ' || v_surah_name || ' من الآية ' || v_from_ayah || ' إلى ' || v_to_ayah,
      v_uthmani_text,
      v_readable_text,
      'assigned',
      greatest(coalesce(p_achievement_points, 10), 0),
      greatest(coalesce(p_reward_points, 0), 0),
      nullif(trim(p_notes), ''),
      coalesce(p_start_date, current_date) + (v_day - 1),
      v_day
    );

    v_from_ayah := v_to_ayah + 1;
  end loop;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'surah_name', v_surah_name,
    'total_ayahs', v_total_ayahs,
    'duration_days', v_duration,
    'scheduled_days', v_memorization_days,
    'review_days', v_review_days,
    'daily_min', v_base_size,
    'daily_max', v_base_size + case when v_extra_days > 0 then 1 else 0 end,
    'due_date', v_due_date
  );
end;
$function$;

revoke all on function public.create_quran_scheduled_plan(uuid,text,integer,date,integer,integer,integer,text) from public;
grant execute on function public.create_quran_scheduled_plan(uuid,text,integer,date,integer,integer,integer,text) to authenticated;

create or replace function public.parent_add_quran_segment(
  p_plan_id uuid,
  p_surah_number integer,
  p_from_ayah integer,
  p_to_ayah integer,
  p_portion_label text,
  p_achievement_points integer,
  p_reward_points integer,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_org_id uuid;
  v_segment_id uuid;
  v_uthmani_text text;
  v_readable_text text;
begin
  select qp.student_id, qp.organization_id
  into v_student_id, v_org_id
  from public.quran_plans qp
  where qp.id = p_plan_id;

  if v_student_id is null or not public.is_organization_owner(v_org_id) then
    raise exception 'غير مصرح لك بتنفيذ العملية';
  end if;

  if p_surah_number not between 1 and 114 or p_from_ayah < 1 or p_to_ayah < p_from_ayah then
    raise exception 'نطاق الآيات غير صحيح';
  end if;

  select
    string_agg(qa.uthmani_text, ' ' order by qa.ayah_number),
    string_agg(
      trim(coalesce(nullif(qa.search_text, ''), qa.uthmani_text)) || ' ﴿' || public.to_arabic_indic_number(qa.ayah_number) || '﴾',
      ' '
      order by qa.ayah_number
    )
  into v_uthmani_text, v_readable_text
  from public.quran_ayahs qa
  where qa.surah_number = p_surah_number
    and qa.ayah_number between p_from_ayah and p_to_ayah;

  if v_uthmani_text is null then
    raise exception 'تعذر العثور على نص الآيات المطلوبة';
  end if;

  insert into public.quran_segments(
    plan_id, surah_number, from_ayah, to_ayah,
    portion_label, uthmani_text, readable_text,
    status, achievement_points, reward_points, notes
  ) values (
    p_plan_id, p_surah_number, p_from_ayah, p_to_ayah,
    nullif(trim(p_portion_label), ''), v_uthmani_text, v_readable_text,
    'assigned', greatest(coalesce(p_achievement_points, 0), 0),
    greatest(coalesce(p_reward_points, 0), 0), nullif(trim(p_notes), '')
  ) returning id into v_segment_id;

  return v_segment_id;
end;
$function$;

create or replace function public.get_parent_quran_plans(p_student_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', qp.id,
    'title', qp.title,
    'status', qp.status,
    'plan_type', qp.plan_type,
    'start_date', qp.start_date,
    'due_date', qp.due_date,
    'daily_target', qp.daily_target,
    'source_name', qp.source_name,
    'surah_number', qp.surah_number,
    'duration_days', qp.duration_days,
    'segments_count', (select count(*) from public.quran_segments qs where qs.plan_id = qp.id),
    'mastered_count', (select count(*) from public.quran_segments qs where qs.plan_id = qp.id and qs.status = 'mastered')
  ) order by qp.created_at desc), '[]'::jsonb)
  from public.quran_plans qp
  join public.students s on s.id = qp.student_id
  where qp.student_id = p_student_id
    and public.is_organization_owner(s.organization_id)
$function$;

create or replace function public.get_child_quran_dashboard(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.revoked_at is null and cs.expires_at > now();

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
        'duration_days', qp.duration_days
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
        'surah_number', qs.surah_number
      ) order by qs.scheduled_date nulls last, qs.day_number nulls last, qs.created_at asc)
      from public.quran_segments qs
      join public.quran_plans qp on qp.id = qs.plan_id
      where qp.student_id = v_student_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;
