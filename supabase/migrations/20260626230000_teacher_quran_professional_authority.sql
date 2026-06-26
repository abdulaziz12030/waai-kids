create or replace function public.is_active_teacher_for_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $function$
  select exists (
    select 1 from public.teacher_student_links l
    where l.student_id = p_student_id
      and l.teacher_user_id = auth.uid()
      and l.status = 'active'
  )
$function$;

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
  select s.organization_id into v_org_id
  from public.students s
  where s.id = p_student_id;

  if v_org_id is null or not public.is_active_teacher_for_student(p_student_id) then
    raise exception 'إنشاء خطة الحفظ من صلاحية المعلم المرتبط بالطالب';
  end if;

  if p_surah_number not between 1 and 114 then
    raise exception 'رقم السورة غير صحيح';
  end if;

  select qa.surah_name_ar into v_surah_name
  from public.quran_ayahs qa
  where qa.surah_number = p_surah_number
  group by qa.surah_name_ar
  order by count(*) desc
  limit 1;

  select count(*)::integer into v_total_ayahs
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
    'teacher',
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
        ' ' order by qa.ayah_number
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
      v_plan_id, p_surah_number, v_from_ayah, v_to_ayah,
      'اليوم ' || v_day || ' — سورة ' || v_surah_name || ' من الآية ' || v_from_ayah || ' إلى ' || v_to_ayah,
      v_uthmani_text, v_readable_text, 'assigned',
      greatest(coalesce(p_achievement_points, 10), 0), 0,
      nullif(trim(p_notes), ''),
      coalesce(p_start_date, current_date) + (v_day - 1), v_day
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

create or replace function public.get_student_quran_plans_shared(p_student_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $function$
  select case
    when not (
      public.is_organization_owner(s.organization_id)
      or public.is_active_teacher_for_student(s.id)
    ) then '[]'::jsonb
    else coalesce((
      select jsonb_agg(jsonb_build_object(
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
        'assigned_count', (select count(*) from public.quran_segments qs where qs.plan_id = qp.id and qs.status = 'assigned'),
        'waiting_count', (select count(*) from public.quran_segments qs where qs.plan_id = qp.id and qs.status in ('memorized','recited')),
        'revision_count', (select count(*) from public.quran_segments qs where qs.plan_id = qp.id and qs.status = 'needs_revision'),
        'mastered_count', (select count(*) from public.quran_segments qs where qs.plan_id = qp.id and qs.status = 'mastered')
      ) order by qp.created_at desc)
      from public.quran_plans qp
      where qp.student_id = p_student_id
    ), '[]'::jsonb)
  end
  from public.students s
  where s.id = p_student_id
$function$;

create or replace function public.get_quran_plan_segments_shared(p_plan_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $function$
  select case
    when not (
      public.is_organization_owner(qp.organization_id)
      or public.is_active_teacher_for_student(qp.student_id)
    ) then '[]'::jsonb
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qs.id,
        'plan_id', qs.plan_id,
        'surah_number', qs.surah_number,
        'from_ayah', qs.from_ayah,
        'to_ayah', qs.to_ayah,
        'portion_label', qs.portion_label,
        'uthmani_text', qs.uthmani_text,
        'readable_text', qs.readable_text,
        'status', qs.status,
        'achievement_points', qs.achievement_points,
        'reward_points', qs.reward_points,
        'notes', qs.notes,
        'scheduled_date', qs.scheduled_date,
        'day_number', qs.day_number,
        'memorized_at', qs.memorized_at,
        'recited_at', qs.recited_at,
        'mastered_at', qs.mastered_at,
        'review_count', qs.review_count,
        'latest_mistakes_count', latest_review.mistakes_count,
        'latest_fluency_score', latest_review.fluency_score,
        'latest_tajweed_score', latest_review.tajweed_score,
        'latest_review_notes', latest_review.notes,
        'latest_reviewed_at', latest_review.attempted_at
      ) order by qs.scheduled_date nulls last, qs.day_number nulls last, qs.created_at)
      from public.quran_segments qs
      left join lateral (
        select qr.mistakes_count, qr.fluency_score, qr.tajweed_score,
               qr.notes, qr.attempted_at
        from public.quran_recitations qr
        where qr.segment_id = qs.id
        order by qr.attempted_at desc, qr.created_at desc
        limit 1
      ) latest_review on true
      where qs.plan_id = p_plan_id
    ), '[]'::jsonb)
  end
  from public.quran_plans qp
  where qp.id = p_plan_id
$function$;

create or replace function public.teacher_add_quran_segment(
  p_plan_id uuid,
  p_surah_number integer,
  p_from_ayah integer,
  p_to_ayah integer,
  p_portion_label text,
  p_achievement_points integer,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_segment_id uuid;
  v_uthmani_text text;
  v_readable_text text;
begin
  select qp.student_id into v_student_id
  from public.quran_plans qp
  where qp.id = p_plan_id;

  if v_student_id is null or not public.is_active_teacher_for_student(v_student_id) then
    raise exception 'إضافة مقاطع الحفظ من صلاحية المعلم المرتبط';
  end if;

  if p_surah_number not between 1 and 114 or p_from_ayah < 1 or p_to_ayah < p_from_ayah then
    raise exception 'نطاق الآيات غير صحيح';
  end if;

  select
    string_agg(qa.uthmani_text, ' ' order by qa.ayah_number),
    string_agg(
      trim(coalesce(nullif(qa.search_text, ''), qa.uthmani_text)) || ' ﴿' || public.to_arabic_indic_number(qa.ayah_number) || '﴾',
      ' ' order by qa.ayah_number
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
    0, nullif(trim(p_notes), '')
  ) returning id into v_segment_id;

  return v_segment_id;
end;
$function$;

create or replace function public.teacher_delete_quran_segment(p_segment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
begin
  select qp.student_id into v_student_id
  from public.quran_segments qs
  join public.quran_plans qp on qp.id = qs.plan_id
  where qs.id = p_segment_id;

  if v_student_id is null or not public.is_active_teacher_for_student(v_student_id) then
    raise exception 'حذف المقطع من صلاحية المعلم المرتبط';
  end if;

  if exists (
    select 1 from public.points_ledger
    where source_type = 'quran_segment' and source_id = p_segment_id
  ) then
    raise exception 'لا يمكن حذف مقطع احتُسبت نقاطه';
  end if;

  delete from public.quran_audio_submissions where segment_id = p_segment_id;
  delete from public.quran_recitations where segment_id = p_segment_id;
  delete from public.quran_segments where id = p_segment_id;
end;
$function$;

create or replace function public.delete_quran_plan_shared(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_has_points boolean;
begin
  select qp.student_id into v_student_id
  from public.quran_plans qp
  where qp.id = p_plan_id;

  if v_student_id is null then
    raise exception 'خطة الحفظ غير موجودة';
  end if;

  if not public.is_active_teacher_for_student(v_student_id) then
    raise exception 'إدارة خطط الحفظ من صلاحية المعلم المرتبط';
  end if;

  select exists(
    select 1
    from public.points_ledger pl
    join public.quran_segments qs on qs.id = pl.source_id
    where qs.plan_id = p_plan_id
      and pl.source_type = 'quran_segment'
  ) into v_has_points;

  if v_has_points then
    raise exception 'لا يمكن حذف خطة احتُسبت نقاط أحد مقاطعها';
  end if;

  delete from public.quran_audio_submissions qa
  using public.quran_segments qs
  where qa.segment_id = qs.id and qs.plan_id = p_plan_id;

  delete from public.quran_recitations qr
  using public.quran_segments qs
  where qr.segment_id = qs.id and qs.plan_id = p_plan_id;

  delete from public.quran_segments where plan_id = p_plan_id;
  delete from public.quran_plans where id = p_plan_id;
end;
$function$;

create or replace function public.review_quran_segment_shared(
  p_segment_id uuid,
  p_status text,
  p_mistakes_count integer default 0,
  p_fluency_score integer default null,
  p_tajweed_score integer default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_org_id uuid;
  v_plan_id uuid;
  v_achievement integer;
  v_old_status public.quran_progress_status;
begin
  select qp.student_id, qp.organization_id, qp.id,
         qs.achievement_points, qs.status
  into v_student_id, v_org_id, v_plan_id, v_achievement, v_old_status
  from public.quran_segments qs
  join public.quran_plans qp on qp.id = qs.plan_id
  where qs.id = p_segment_id;

  if v_student_id is null then
    raise exception 'المقطع غير موجود';
  end if;

  if not public.is_active_teacher_for_student(v_student_id) then
    raise exception 'التقييم والاعتماد من صلاحية المعلم المرتبط بالطالب';
  end if;

  if p_status not in ('mastered','needs_revision') then
    raise exception 'اختر اعتماد الإتقان أو الإعادة للتصحيح';
  end if;

  if v_old_status not in ('memorized','recited') then
    raise exception 'لا توجد محاولة جديدة جاهزة للتقييم';
  end if;

  if p_fluency_score is not null and (p_fluency_score < 0 or p_fluency_score > 100) then
    raise exception 'درجة الطلاقة يجب أن تكون بين 0 و100';
  end if;

  if p_tajweed_score is not null and (p_tajweed_score < 0 or p_tajweed_score > 100) then
    raise exception 'درجة التجويد يجب أن تكون بين 0 و100';
  end if;

  update public.quran_segments
  set status = p_status::public.quran_progress_status,
      memorized_at = coalesce(memorized_at, now()),
      recited_at = coalesce(recited_at, now()),
      mastered_at = case when p_status = 'mastered' then now() else null end,
      approved_by = case when p_status = 'mastered' then auth.uid() else null end,
      last_review_at = now(),
      review_count = review_count + 1
  where id = p_segment_id;

  insert into public.quran_recitations(
    segment_id, student_id, reviewer_id, reviewer_type, result,
    mistakes_count, fluency_score, tajweed_score, notes
  ) values (
    p_segment_id, v_student_id, auth.uid(), 'teacher',
    case when p_status = 'needs_revision' then 'needs_revision' else 'passed' end,
    greatest(coalesce(p_mistakes_count, 0), 0),
    p_fluency_score, p_tajweed_score, nullif(trim(p_notes), '')
  );

  if p_status = 'mastered' and v_old_status <> 'mastered' and v_achievement > 0
     and not exists (
       select 1 from public.points_ledger
       where student_id = v_student_id
         and source_type = 'quran_segment'
         and source_id = p_segment_id
         and point_type = 'achievement'
     ) then
    insert into public.points_ledger(
      organization_id, student_id, source_type, source_id,
      points, note, created_by, point_type
    ) values (
      v_org_id, v_student_id, 'quran_segment', p_segment_id,
      v_achievement, 'إتقان مقطع قرآن باعتماد المعلم', auth.uid(), 'achievement'
    );

    update public.students
    set achievement_points = achievement_points + v_achievement,
        points_balance = points_balance + v_achievement,
        updated_at = now()
    where id = v_student_id;
  end if;

  if p_status = 'mastered' and not exists (
    select 1 from public.quran_segments
    where plan_id = v_plan_id and status <> 'mastered'
  ) then
    update public.quran_plans set status = 'completed' where id = v_plan_id;
  elsif p_status = 'needs_revision' then
    update public.quran_plans set status = 'active' where id = v_plan_id;
  end if;
end;
$function$;

create or replace function public.get_quran_review_queue()
returns jsonb
language sql
security definer
set search_path = public
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'segment_id', qs.id,
    'student_id', s.id,
    'student_name', s.full_name,
    'plan_title', qp.title,
    'portion_label', qs.portion_label,
    'uthmani_text', qs.uthmani_text,
    'readable_text', qs.readable_text,
    'status', qs.status,
    'scheduled_date', qs.scheduled_date,
    'day_number', qs.day_number,
    'achievement_points', qs.achievement_points,
    'reward_points', qs.reward_points,
    'notes', qs.notes,
    'memorized_at', qs.memorized_at,
    'mastered_at', qs.mastered_at,
    'has_audio', exists(
      select 1 from public.quran_audio_submissions qa
      where qa.segment_id = qs.id
    ),
    'audio_duration_seconds', (
      select qa.duration_seconds from public.quran_audio_submissions qa
      where qa.segment_id = qs.id
    ),
    'review_mode', case
      when public.is_active_teacher_for_student(s.id) then 'teacher'
      when qs.status in ('memorized','recited') then 'parent_supervision_pending'
      when qs.status = 'needs_revision' then 'parent_supervision_revision'
      when qs.status = 'mastered' then 'parent_supervision_completed'
      else 'parent_supervision'
    end,
    'latest_mistakes_count', latest_review.mistakes_count,
    'latest_fluency_score', latest_review.fluency_score,
    'latest_tajweed_score', latest_review.tajweed_score,
    'latest_review_notes', latest_review.notes,
    'latest_reviewer_type', latest_review.reviewer_type,
    'latest_reviewed_at', latest_review.attempted_at
  ) order by
    case
      when qs.status in ('memorized','recited') then 1
      when qs.status = 'needs_revision' then 2
      when qs.status = 'mastered' then 3
      else 4
    end,
    coalesce(qs.mastered_at, qs.memorized_at, qs.created_at) desc), '[]'::jsonb)
  from public.quran_segments qs
  join public.quran_plans qp on qp.id = qs.plan_id
  join public.students s on s.id = qp.student_id
  left join lateral (
    select qr.mistakes_count, qr.fluency_score, qr.tajweed_score,
           qr.notes, qr.reviewer_type, qr.attempted_at
    from public.quran_recitations qr
    where qr.segment_id = qs.id
    order by qr.attempted_at desc, qr.created_at desc
    limit 1
  ) latest_review on true
  where (
    public.is_active_teacher_for_student(s.id)
    and qs.status in ('memorized','recited')
  ) or (
    public.is_organization_owner(s.organization_id)
    and qs.status in ('memorized','recited','needs_revision','mastered')
  )
$function$;

revoke all on function public.is_active_teacher_for_student(uuid) from public;
revoke all on function public.create_quran_scheduled_plan(uuid,text,integer,date,integer,integer,integer,text) from public;
revoke all on function public.get_student_quran_plans_shared(uuid) from public;
revoke all on function public.get_quran_plan_segments_shared(uuid) from public;
revoke all on function public.teacher_add_quran_segment(uuid,integer,integer,integer,text,integer,text) from public;
revoke all on function public.teacher_delete_quran_segment(uuid) from public;
revoke all on function public.delete_quran_plan_shared(uuid) from public;
revoke all on function public.review_quran_segment_shared(uuid,text,integer,integer,integer,text) from public;
revoke all on function public.get_quran_review_queue() from public;
revoke all on function public.parent_add_quran_segment(uuid,integer,integer,integer,text,integer,integer,text) from public;
revoke all on function public.parent_delete_quran_segment(uuid) from public;
revoke all on function public.parent_review_quran_segment(uuid,text,integer,integer,integer,text) from public;
revoke execute on function public.parent_add_quran_segment(uuid,integer,integer,integer,text,integer,integer,text) from authenticated;
revoke execute on function public.parent_delete_quran_segment(uuid) from authenticated;
revoke execute on function public.parent_review_quran_segment(uuid,text,integer,integer,integer,text) from authenticated;
grant execute on function public.is_active_teacher_for_student(uuid) to authenticated;
grant execute on function public.create_quran_scheduled_plan(uuid,text,integer,date,integer,integer,integer,text) to authenticated;
grant execute on function public.get_student_quran_plans_shared(uuid) to authenticated;
grant execute on function public.get_quran_plan_segments_shared(uuid) to authenticated;
grant execute on function public.teacher_add_quran_segment(uuid,integer,integer,integer,text,integer,text) to authenticated;
grant execute on function public.teacher_delete_quran_segment(uuid) to authenticated;
grant execute on function public.delete_quran_plan_shared(uuid) to authenticated;
grant execute on function public.review_quran_segment_shared(uuid,text,integer,integer,integer,text) to authenticated;
grant execute on function public.get_quran_review_queue() to authenticated;
