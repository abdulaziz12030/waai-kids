create or replace function public.can_manage_student_learning(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and (
        public.is_organization_owner(s.organization_id)
        or public.is_active_teacher_for_student(s.id)
      )
  );
$$;

create or replace function public.assign_multiplication_program(
  p_student_id uuid,
  p_from_table integer default 1,
  p_to_table integer default 10,
  p_questions_per_stage integer default 10,
  p_pass_percentage integer default 80,
  p_achievement_points integer default 100,
  p_reward_points integer default 10,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_task_id uuid;
  v_program_id uuid;
  v_role text;
  v_table integer;
begin
  select * into v_student from public.students where id = p_student_id;
  if v_student.id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.can_manage_student_learning(p_student_id) then raise exception 'غير مصرح لك بإسناد البرنامج'; end if;
  if p_from_table < 1 or p_to_table > 12 or p_from_table > p_to_table then raise exception 'نطاق الجداول غير صحيح'; end if;
  if p_questions_per_stage < 5 or p_questions_per_stage > 10 then raise exception 'عدد الأسئلة يجب أن يكون بين 5 و10'; end if;
  if p_pass_percentage < 50 or p_pass_percentage > 100 then raise exception 'نسبة النجاح غير صحيحة'; end if;

  v_role := case when public.is_organization_owner(v_student.organization_id) then 'parent' else 'teacher' end;

  insert into public.tasks(
    organization_id, student_id, title, description, category, difficulty,
    points, achievement_points, reward_points, points_mode, status,
    due_date, assigned_by, recurrence
  ) values (
    v_student.organization_id,
    p_student_id,
    'مغامرة أبطال جدول الضرب',
    format('إتقان جداول الضرب من %s إلى %s عبر بطاقات تعلم وتحديات تفاعلية.', p_from_table, p_to_table),
    'educational',
    'major',
    greatest(coalesce(p_achievement_points, 0), 0) + greatest(coalesce(p_reward_points, 0), 0),
    greatest(coalesce(p_achievement_points, 0), 0),
    greatest(coalesce(p_reward_points, 0), 0),
    'manual',
    'pending',
    p_due_date,
    auth.uid(),
    'once'
  ) returning id into v_task_id;

  insert into public.multiplication_programs(
    organization_id, task_id, student_id, assigned_by, assigned_role,
    from_table, to_table, questions_per_stage, pass_percentage, current_table
  ) values (
    v_student.organization_id, v_task_id, p_student_id, auth.uid(), v_role,
    p_from_table, p_to_table, p_questions_per_stage, p_pass_percentage, p_from_table
  ) returning id into v_program_id;

  for v_table in p_from_table..p_to_table loop
    insert into public.multiplication_stage_progress(program_id, table_number, status)
    values (v_program_id, v_table, case when v_table = p_from_table then 'available' else 'locked' end);
  end loop;

  insert into public.child_notifications(
    organization_id, student_id, notification_type, title, body, icon,
    action_type, action_id, source_key, metadata
  ) values (
    v_student.organization_id,
    p_student_id,
    'task_assigned',
    'مغامرة جديدة في جدول الضرب',
    format('ابدأ من جدول %s وتقدم حتى جدول %s لتصبح بطل جدول الضرب.', p_from_table, p_to_table),
    '✖️',
    'multiplication_program',
    v_program_id,
    'multiplication-assigned:' || v_program_id::text,
    jsonb_build_object('program_id', v_program_id, 'task_id', v_task_id)
  ) on conflict (source_key) do nothing;

  return v_program_id;
end;
$$;

create or replace function public.get_multiplication_programs_for_student(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_student_learning(p_student_id) then raise exception 'غير مصرح لك بعرض البرامج'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'task_id', p.task_id,
      'student_id', p.student_id,
      'assigned_role', p.assigned_role,
      'from_table', p.from_table,
      'to_table', p.to_table,
      'questions_per_stage', p.questions_per_stage,
      'pass_percentage', p.pass_percentage,
      'status', p.status,
      'current_table', p.current_table,
      'completed_tables', p.completed_tables,
      'completed_at', p.completed_at,
      'created_at', p.created_at,
      'task_status', t.status,
      'due_date', t.due_date,
      'achievement_points', t.achievement_points,
      'reward_points', t.reward_points,
      'stages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'table_number', s.table_number,
          'status', s.status,
          'attempts_count', s.attempts_count,
          'best_score', s.best_score,
          'completed_at', s.completed_at
        ) order by s.table_number)
        from public.multiplication_stage_progress s
        where s.program_id = p.id
      ), '[]'::jsonb)
    ) order by p.created_at desc)
    from public.multiplication_programs p
    join public.tasks t on t.id = p.task_id
    where p.student_id = p_student_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.delete_multiplication_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program public.multiplication_programs%rowtype;
begin
  select * into v_program from public.multiplication_programs where id = p_program_id;
  if v_program.id is null then raise exception 'البرنامج غير موجود'; end if;
  if not public.can_manage_student_learning(v_program.student_id) then raise exception 'غير مصرح لك بحذف البرنامج'; end if;
  if v_program.status = 'completed' then raise exception 'لا يمكن حذف برنامج مكتمل بعد احتساب نقاطه'; end if;
  delete from public.tasks where id = v_program.task_id;
end;
$$;
