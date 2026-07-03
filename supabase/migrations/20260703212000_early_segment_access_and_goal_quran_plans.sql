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

  if v_task.starts_on is not null
     and v_task.starts_on > current_date
     and v_task.plan_batch_id is null then
    raise exception 'لم يحن وقت هذه المهمة بعد';
  end if;

  update public.tasks
  set status = 'submitted',
      child_note = nullif(trim(p_child_note), ''),
      submitted_at = now(),
      updated_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.convert_goal_to_quran_task_plan(
  p_goal_id uuid,
  p_quran_mode text,
  p_surah_number integer,
  p_from_ayah integer,
  p_to_ayah integer,
  p_start_date date,
  p_due_date date,
  p_split_mode text default 'days',
  p_split_value integer default 1,
  p_title_prefix text default null,
  p_notes text default null,
  p_difficulty text default 'medium',
  p_points_mode text default 'automatic',
  p_achievement_points integer default 10,
  p_reward_points integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_mode text := lower(coalesce(trim(p_quran_mode), 'recitation'));
  v_split text := lower(coalesce(trim(p_split_mode), 'days'));
  v_surah_name text;
  v_max_ayah integer;
  v_from integer;
  v_to integer;
  v_total_ayahs integer;
  v_duration integer;
  v_parts integer;
  v_batch_id uuid := gen_random_uuid();
  v_base_size integer;
  v_extra_parts integer;
  v_step integer;
  v_current_ayah integer;
  v_part_size integer;
  v_end_ayah integer;
  v_scheduled_date date;
  v_mode_label text;
  v_title_base text;
  v_quran_text text;
  v_description text;
  v_difficulty text := lower(coalesce(trim(p_difficulty), 'medium'));
  v_points_mode text := lower(coalesce(trim(p_points_mode), 'automatic'));
  v_achievement integer;
  v_reward integer;
begin
  select g.* into v_goal
  from public.goals g
  where g.id = p_goal_id
  for update;

  if v_goal.id is null then raise exception 'الهدف غير موجود'; end if;
  if not public.is_organization_owner(v_goal.organization_id) then raise exception 'غير مصرح لك بتحويل هذا الهدف'; end if;
  if v_goal.status::text not in ('pending', 'requested', 'approved', 'paused') then raise exception 'حالة الهدف لا تسمح بتحويله إلى مهام'; end if;
  if exists (select 1 from public.tasks t where t.goal_id = p_goal_id) then raise exception 'يوجد مهام مرتبطة بهذا الهدف بالفعل'; end if;

  if v_mode not in ('recitation', 'memorization') then raise exception 'اختر تلاوة أو حفظ'; end if;
  if v_split not in ('single', 'days', 'parts', 'ayahs') then raise exception 'طريقة تقسيم الآيات غير صحيحة'; end if;
  if p_start_date is null or p_due_date is null then raise exception 'حدد تاريخ البداية والاستحقاق'; end if;
  if p_due_date < p_start_date then raise exception 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ البداية'; end if;
  if p_surah_number not between 1 and 114 then raise exception 'رقم السورة غير صحيح'; end if;

  select max(qa.surah_name_ar), max(qa.ayah_number)
  into v_surah_name, v_max_ayah
  from public.quran_ayahs qa
  where qa.surah_number = p_surah_number;

  if v_max_ayah is null then raise exception 'تعذر العثور على آيات السورة'; end if;

  v_from := greatest(coalesce(p_from_ayah, 1), 1);
  v_to := least(coalesce(p_to_ayah, v_max_ayah), v_max_ayah);
  if v_to < v_from then raise exception 'نطاق الآيات غير صحيح'; end if;

  v_total_ayahs := v_to - v_from + 1;
  v_duration := (p_due_date - p_start_date) + 1;
  if v_duration > 366 then raise exception 'المدة القصوى للخطة سنة واحدة'; end if;

  v_parts := case v_split
    when 'single' then 1
    when 'days' then least(v_duration, v_total_ayahs)
    when 'parts' then least(greatest(coalesce(p_split_value, 1), 1), v_total_ayahs)
    when 'ayahs' then ceil(v_total_ayahs::numeric / greatest(coalesce(p_split_value, 1), 1))::integer
  end;

  v_base_size := floor(v_total_ayahs::numeric / v_parts)::integer;
  v_extra_parts := mod(v_total_ayahs, v_parts);
  v_mode_label := case when v_mode = 'memorization' then 'حفظ' else 'تلاوة' end;
  v_title_base := coalesce(nullif(trim(p_title_prefix), ''), nullif(trim(v_goal.title), ''), v_mode_label || ' سورة ' || v_surah_name);
  v_description := coalesce(nullif(trim(p_notes), ''), nullif(trim(v_goal.description), ''));

  if v_points_mode = 'automatic' then
    select r.achievement_points, r.reward_points
    into v_achievement, v_reward
    from public.point_rules r
    where r.organization_id = v_goal.organization_id
      and r.category = 'quran'
      and r.difficulty = v_difficulty
      and r.is_active
    limit 1;
  end if;

  v_achievement := coalesce(v_achievement, greatest(coalesce(p_achievement_points, 0), 0));
  v_reward := coalesce(v_reward, greatest(coalesce(p_reward_points, 0), 0));
  v_current_ayah := v_from;

  for v_step in 1..v_parts loop
    if v_split = 'ayahs' then
      v_part_size := least(greatest(coalesce(p_split_value, 1), 1), v_to - v_current_ayah + 1);
    else
      v_part_size := v_base_size + case when v_step <= v_extra_parts then 1 else 0 end;
    end if;

    v_end_ayah := least(v_current_ayah + v_part_size - 1, v_to);
    v_scheduled_date := p_start_date + floor(((v_step - 1)::numeric * v_duration::numeric) / v_parts::numeric)::integer;

    select string_agg(
      trim(coalesce(nullif(qa.search_text, ''), qa.uthmani_text)) || ' ﴿' || public.to_arabic_indic_number(qa.ayah_number) || '﴾',
      ' ' order by qa.ayah_number
    ) into v_quran_text
    from public.quran_ayahs qa
    where qa.surah_number = p_surah_number
      and qa.ayah_number between v_current_ayah and v_end_ayah;

    insert into public.tasks(
      organization_id, goal_id, student_id, title, description, category, difficulty,
      points, achievement_points, reward_points, points_mode, status,
      starts_on, due_date, assigned_by, recurrence,
      plan_batch_id, plan_step, plan_total, generated_from_goal,
      quran_mode, surah_number, from_ayah, to_ayah, quran_text,
      quran_plan_title, generated_from_quran_task
    ) values (
      v_goal.organization_id, v_goal.id, v_goal.student_id,
      v_mode_label || ' سورة ' || v_surah_name || ' — الآيات ' || v_current_ayah || ' إلى ' || v_end_ayah,
      v_description, 'quran', v_difficulty,
      v_achievement + v_reward, v_achievement, v_reward, v_points_mode, 'pending',
      v_scheduled_date, v_scheduled_date, auth.uid(), 'once',
      v_batch_id, v_step, v_parts, true,
      v_mode, p_surah_number, v_current_ayah, v_end_ayah, v_quran_text,
      v_title_base, true
    );

    v_current_ayah := v_end_ayah + 1;
  end loop;

  update public.goals
  set status = 'approved',
      start_date = p_start_date,
      due_date = p_due_date,
      approved_by = auth.uid(),
      approved_at = now(),
      decided_by = auth.uid(),
      decided_at = now(),
      decision_note = v_description,
      converted_to_tasks_at = now(),
      task_plan_mode = case when v_mode = 'memorization' then 'حفظ قرآني' else 'تلاوة قرآنية' end,
      task_plan_count = v_parts,
      updated_at = now()
  where id = p_goal_id;

  return jsonb_build_object(
    'goal_id', p_goal_id,
    'plan_batch_id', v_batch_id,
    'task_count', v_parts,
    'quran_mode', v_mode,
    'surah_number', p_surah_number,
    'surah_name', v_surah_name,
    'from_ayah', v_from,
    'to_ayah', v_to,
    'split_mode', v_split,
    'start_date', p_start_date,
    'due_date', p_due_date
  );
end;
$$;

revoke all on function public.convert_goal_to_quran_task_plan(uuid,text,integer,integer,integer,date,date,text,integer,text,text,text,text,integer,integer) from public, anon;
grant execute on function public.convert_goal_to_quran_task_plan(uuid,text,integer,integer,integer,date,date,text,integer,text,text,text,text,integer,integer) to authenticated;
