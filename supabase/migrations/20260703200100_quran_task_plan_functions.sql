create or replace function public.get_quran_surah_catalog()
returns table(surah_number integer, surah_name_ar text, ayah_count integer)
language sql
security definer
set search_path = public
as $$
  select qa.surah_number, max(qa.surah_name_ar) as surah_name_ar, count(*)::integer as ayah_count
  from public.quran_ayahs qa
  group by qa.surah_number
  order by qa.surah_number;
$$;

create or replace function public.create_quran_task_plan(
  p_student_id uuid,
  p_mode text,
  p_surah_number integer,
  p_from_ayah integer,
  p_to_ayah integer,
  p_start_date date,
  p_duration_days integer,
  p_split_mode text,
  p_split_value integer,
  p_title text,
  p_notes text,
  p_achievement_points integer,
  p_reward_points integer,
  p_points_mode text default 'automatic'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_surah_name text;
  v_max_ayah integer;
  v_from integer;
  v_to integer;
  v_total integer;
  v_parts integer;
  v_duration integer;
  v_start date;
  v_batch uuid := gen_random_uuid();
  v_base integer;
  v_extra integer;
  v_step integer;
  v_current integer;
  v_size integer;
  v_end integer;
  v_scheduled date;
  v_mode_label text;
  v_plan_title text;
  v_text text;
  v_achievement integer;
  v_reward integer;
  v_difficulty text;
begin
  select s.organization_id into v_org_id from public.students s where s.id = p_student_id;
  if v_org_id is null or not public.is_organization_owner(v_org_id) then raise exception 'غير مصرح لك بتنفيذ العملية'; end if;
  if p_mode not in ('recitation','memorization') then raise exception 'نوع المهمة القرآنية غير صحيح'; end if;
  if p_split_mode not in ('single','days','parts','ayahs') then raise exception 'طريقة التقسيم غير صحيحة'; end if;
  if p_surah_number not between 1 and 114 then raise exception 'رقم السورة غير صحيح'; end if;

  select max(qa.surah_name_ar), max(qa.ayah_number) into v_surah_name, v_max_ayah
  from public.quran_ayahs qa where qa.surah_number = p_surah_number;
  if v_max_ayah is null then raise exception 'تعذر العثور على آيات السورة'; end if;

  v_from := greatest(coalesce(p_from_ayah, 1), 1);
  v_to := least(coalesce(p_to_ayah, v_max_ayah), v_max_ayah);
  if v_to < v_from then raise exception 'نطاق الآيات غير صحيح'; end if;

  v_total := v_to - v_from + 1;
  v_duration := greatest(coalesce(p_duration_days, 1), 1);
  v_start := coalesce(p_start_date, current_date);
  v_parts := case p_split_mode
    when 'single' then 1
    when 'days' then least(v_duration, v_total)
    when 'parts' then least(greatest(coalesce(p_split_value, 1), 1), v_total)
    when 'ayahs' then ceil(v_total::numeric / greatest(coalesce(p_split_value, 1), 1))::integer
  end;

  v_base := floor(v_total::numeric / v_parts)::integer;
  v_extra := mod(v_total, v_parts);
  v_mode_label := case when p_mode = 'memorization' then 'حفظ' else 'تلاوة' end;
  v_plan_title := coalesce(nullif(trim(p_title), ''), v_mode_label || ' سورة ' || v_surah_name);
  v_difficulty := case when p_mode = 'memorization' then 'major' else 'medium' end;

  if coalesce(nullif(trim(p_points_mode), ''), 'automatic') = 'automatic' then
    select r.achievement_points, r.reward_points into v_achievement, v_reward
    from public.point_rules r
    where r.organization_id = v_org_id and r.category = 'quran' and r.difficulty = v_difficulty and r.is_active
    limit 1;
  end if;

  v_achievement := coalesce(v_achievement, greatest(coalesce(p_achievement_points, 0), 0));
  v_reward := coalesce(v_reward, greatest(coalesce(p_reward_points, 0), 0));
  v_current := v_from;

  for v_step in 1..v_parts loop
    if p_split_mode = 'ayahs' then
      v_size := least(greatest(coalesce(p_split_value, 1), 1), v_to - v_current + 1);
    else
      v_size := v_base + case when v_step <= v_extra then 1 else 0 end;
    end if;

    v_end := least(v_current + v_size - 1, v_to);
    v_scheduled := v_start + floor(((v_step - 1)::numeric * v_duration::numeric) / v_parts::numeric)::integer;

    select string_agg(
      trim(coalesce(nullif(qa.search_text, ''), qa.uthmani_text)) || ' ﴿' || public.to_arabic_indic_number(qa.ayah_number) || '﴾',
      ' ' order by qa.ayah_number
    ) into v_text
    from public.quran_ayahs qa
    where qa.surah_number = p_surah_number and qa.ayah_number between v_current and v_end;

    insert into public.tasks(
      organization_id, student_id, title, description, category, difficulty,
      points, achievement_points, reward_points, points_mode, status,
      starts_on, due_date, assigned_by, recurrence,
      plan_batch_id, plan_step, plan_total, generated_from_goal,
      quran_mode, surah_number, from_ayah, to_ayah, quran_text,
      quran_plan_title, generated_from_quran_task
    ) values (
      v_org_id, p_student_id,
      v_mode_label || ' سورة ' || v_surah_name || ' — الآيات ' || v_current || ' إلى ' || v_end,
      nullif(trim(p_notes), ''), 'quran', v_difficulty,
      v_achievement + v_reward, v_achievement, v_reward,
      coalesce(nullif(trim(p_points_mode), ''), 'automatic'), 'pending',
      v_scheduled, v_scheduled, auth.uid(), 'once',
      v_batch, v_step, v_parts, false,
      p_mode, p_surah_number, v_current, v_end, v_text,
      v_plan_title, true
    );

    v_current := v_end + 1;
  end loop;

  return jsonb_build_object(
    'plan_batch_id', v_batch,
    'plan_title', v_plan_title,
    'mode', p_mode,
    'surah_number', p_surah_number,
    'surah_name', v_surah_name,
    'from_ayah', v_from,
    'to_ayah', v_to,
    'parts_count', v_parts,
    'start_date', v_start,
    'due_date', v_start + (v_duration - 1)
  );
end;
$$;

revoke all on function public.get_quran_surah_catalog() from public, anon;
revoke all on function public.create_quran_task_plan(uuid,text,integer,integer,integer,date,integer,text,integer,text,text,integer,integer,text) from public, anon;
grant execute on function public.get_quran_surah_catalog() to authenticated;
grant execute on function public.create_quran_task_plan(uuid,text,integer,integer,integer,date,integer,text,integer,text,text,integer,integer,text) to authenticated;
