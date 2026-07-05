create or replace function public.get_child_multiplication_programs(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_student_id uuid;
begin
  select student_id into v_student_id from public.child_sessions
  where session_token = p_session_token and expires_at > now() and revoked_at is null;
  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', p.id, 'task_id', p.task_id, 'task_status', t.status,
    'from_table', p.from_table, 'to_table', p.to_table,
    'questions_per_stage', p.questions_per_stage, 'pass_percentage', p.pass_percentage,
    'status', p.status, 'current_table', p.current_table, 'completed_tables', p.completed_tables,
    'total_tables', p.to_table - p.from_table + 1, 'due_date', t.due_date,
    'achievement_points', t.achievement_points, 'reward_points', t.reward_points,
    'stages', coalesce((select jsonb_agg(jsonb_build_object(
      'table_number', s.table_number, 'status', s.status,
      'attempts_count', s.attempts_count, 'best_score', s.best_score
    ) order by s.table_number) from public.multiplication_stage_progress s
    where s.program_id = p.id), '[]'::jsonb)
  ) order by case when p.status = 'active' then 0 else 1 end, p.created_at desc)
  from public.multiplication_programs p join public.tasks t on t.id = p.task_id
  where p.student_id = v_student_id and p.status <> 'cancelled'), '[]'::jsonb);
end;
$$;

create or replace function public.get_child_multiplication_program(p_session_token uuid, p_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_program public.multiplication_programs%rowtype;
  v_task_status text;
begin
  select student_id into v_student_id from public.child_sessions
  where session_token = p_session_token and expires_at > now() and revoked_at is null;
  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;
  select * into v_program from public.multiplication_programs
  where id = p_program_id and student_id = v_student_id;
  if v_program.id is null then raise exception 'البرنامج غير موجود'; end if;
  select status::text into v_task_status from public.tasks where id = v_program.task_id;
  return jsonb_build_object(
    'id', v_program.id, 'task_id', v_program.task_id, 'task_status', v_task_status,
    'from_table', v_program.from_table, 'to_table', v_program.to_table,
    'questions_per_stage', v_program.questions_per_stage, 'pass_percentage', v_program.pass_percentage,
    'status', v_program.status, 'current_table', v_program.current_table,
    'completed_tables', v_program.completed_tables,
    'total_tables', v_program.to_table - v_program.from_table + 1,
    'stages', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'table_number', s.table_number, 'status', s.status,
      'attempts_count', s.attempts_count, 'best_score', s.best_score, 'completed_at', s.completed_at
    ) order by s.table_number) from public.multiplication_stage_progress s
    where s.program_id = v_program.id), '[]'::jsonb)
  );
end;
$$;

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
  v_program public.multiplication_programs%rowtype;
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

  select * into v_program from public.multiplication_programs mp
  where mp.task_id = v_task.id
    and mp.student_id = v_student_id
    and mp.status <> 'cancelled'
  limit 1;

  if v_program.id is not null and v_program.status <> 'completed' then
    raise exception 'لا يمكن إنجاز مهمة جدول الضرب إلا بعد إنهاء كامل التحدي';
  end if;

  if v_task.status not in ('pending', 'rejected') then raise exception 'لا يمكن إرسال هذه المهمة'; end if;
  if v_task.starts_on is not null and v_task.starts_on > current_date then raise exception 'لم يحن وقت هذه المهمة بعد'; end if;

  if v_task.plan_batch_id is not null
     and coalesce(v_task.plan_step, 1) > 1
     and exists (
       select 1 from public.tasks previous_task
       where previous_task.plan_batch_id = v_task.plan_batch_id
         and previous_task.plan_step < v_task.plan_step
         and previous_task.status <> 'approved'
     ) then
    raise exception 'أكمل المرحلة السابقة واعتمدها ولي الأمر أولًا';
  end if;

  update public.tasks
  set status = 'submitted',
      child_note = nullif(trim(p_child_note), ''),
      submitted_at = now(),
      updated_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.answer_child_multiplication_question(p_session_token uuid, p_attempt_id uuid, p_answer integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_attempt public.multiplication_question_attempts%rowtype;
  v_round public.multiplication_rounds%rowtype;
  v_stage public.multiplication_stage_progress%rowtype;
  v_program public.multiplication_programs%rowtype;
  v_task public.tasks%rowtype;
  v_correct boolean;
  v_new_answered integer;
  v_new_correct integer;
  v_score integer;
  v_passed boolean := false;
  v_program_complete boolean := false;
  v_next_table integer;
begin
  select student_id into v_student_id from public.child_sessions
  where session_token = p_session_token and expires_at > now() and revoked_at is null;
  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;
  select * into v_attempt from public.multiplication_question_attempts where id = p_attempt_id and student_id = v_student_id;
  if v_attempt.id is null then raise exception 'السؤال غير موجود'; end if;
  if v_attempt.answered_at is not null then raise exception 'تمت الإجابة عن السؤال مسبقًا'; end if;
  select * into v_round from public.multiplication_rounds where id = v_attempt.round_id and status = 'active';
  if v_round.id is null then raise exception 'الجولة غير متاحة'; end if;

  v_correct := p_answer = v_attempt.correct_answer;
  update public.multiplication_question_attempts set chosen_answer = p_answer, is_correct = v_correct, answered_at = now() where id = v_attempt.id;
  v_new_answered := v_round.answered_count + 1;
  v_new_correct := v_round.correct_count + case when v_correct then 1 else 0 end;
  update public.multiplication_rounds set answered_count = v_new_answered, correct_count = v_new_correct where id = v_round.id;

  if v_new_answered >= v_round.question_limit then
    v_score := round((v_new_correct::numeric / v_round.question_limit::numeric) * 100)::integer;
    select * into v_stage from public.multiplication_stage_progress where id = v_round.stage_id;
    select * into v_program from public.multiplication_programs where id = v_round.program_id;
    v_passed := v_score >= v_program.pass_percentage;
    update public.multiplication_rounds set score = v_score, status = case when v_passed then 'passed' else 'failed' end, completed_at = now() where id = v_round.id;
    update public.multiplication_stage_progress
    set best_score = greatest(best_score, v_score),
        status = case when v_passed then 'completed' else 'available' end,
        completed_at = case when v_passed then coalesce(completed_at, now()) else completed_at end,
        updated_at = now()
    where id = v_stage.id;

    if v_passed then
      v_next_table := v_stage.table_number + 1;
      if v_next_table <= v_program.to_table then
        update public.multiplication_stage_progress set status = 'available', updated_at = now()
        where program_id = v_program.id and table_number = v_next_table and status = 'locked';
        update public.multiplication_programs
        set current_table = greatest(current_table, v_next_table),
            completed_tables = (select count(*) from public.multiplication_stage_progress s where s.program_id = v_program.id and s.status = 'completed'),
            updated_at = now()
        where id = v_program.id;
      else
        v_program_complete := true;
        update public.multiplication_programs
        set status = 'completed', current_table = to_table,
            completed_tables = to_table - from_table + 1,
            completed_at = now(), updated_at = now()
        where id = v_program.id;
        select * into v_task from public.tasks where id = v_program.task_id;
        insert into public.child_notifications(organization_id, student_id, notification_type, title, body, icon, action_type, action_id, source_key, metadata)
        values (v_task.organization_id, v_task.student_id, 'task', 'اكتملت مغامرة جدول الضرب',
          'اضغط إنجاز المهمة حتى تصل لولي الأمر للمراجعة والاعتماد.', '🏆',
          'multiplication_program', v_program.id, 'multiplication-ready-submit:' || v_program.id::text,
          jsonb_build_object('program_id', v_program.id, 'task_id', v_task.id, 'score', v_score))
        on conflict (source_key) do nothing;
      end if;
    end if;
  end if;

  return jsonb_build_object('is_correct', v_correct, 'correct_answer', v_attempt.correct_answer,
    'answered_count', v_new_answered, 'correct_count', v_new_correct,
    'round_complete', v_new_answered >= v_round.question_limit, 'score', v_score,
    'stage_passed', v_passed, 'program_complete', v_program_complete, 'next_table', v_next_table);
end;
$$;
