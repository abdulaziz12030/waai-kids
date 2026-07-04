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
    'id', p.id, 'task_id', p.task_id, 'from_table', p.from_table, 'to_table', p.to_table,
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
begin
  select student_id into v_student_id from public.child_sessions
  where session_token = p_session_token and expires_at > now() and revoked_at is null;
  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;
  select * into v_program from public.multiplication_programs
  where id = p_program_id and student_id = v_student_id;
  if v_program.id is null then raise exception 'البرنامج غير موجود'; end if;
  return jsonb_build_object(
    'id', v_program.id, 'from_table', v_program.from_table, 'to_table', v_program.to_table,
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
