create or replace function public.start_child_multiplication_stage(
  p_session_token uuid,
  p_program_id uuid,
  p_table_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_program public.multiplication_programs%rowtype;
  v_stage public.multiplication_stage_progress%rowtype;
  v_round public.multiplication_rounds%rowtype;
begin
  select student_id into v_student_id from public.child_sessions
  where session_token = p_session_token and expires_at > now() and revoked_at is null;
  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;

  select * into v_program from public.multiplication_programs
  where id = p_program_id and student_id = v_student_id and status = 'active';
  if v_program.id is null then raise exception 'البرنامج غير متاح'; end if;

  select * into v_stage from public.multiplication_stage_progress
  where program_id = v_program.id and table_number = p_table_number;
  if v_stage.id is null or v_stage.status <> 'available' then
    raise exception 'هذه المرحلة غير متاحة للاختبار';
  end if;

  select * into v_round from public.multiplication_rounds
  where stage_id = v_stage.id and status = 'active'
  order by started_at desc limit 1;

  if v_round.id is null then
    update public.multiplication_stage_progress
    set attempts_count = attempts_count + 1, updated_at = now()
    where id = v_stage.id returning * into v_stage;

    insert into public.multiplication_rounds(
      program_id, stage_id, student_id, attempt_number, question_limit
    ) values (
      v_program.id, v_stage.id, v_student_id,
      v_stage.attempts_count, v_program.questions_per_stage
    ) returning * into v_round;
  end if;

  return jsonb_build_object(
    'round_id', v_round.id,
    'table_number', v_stage.table_number,
    'question_limit', v_round.question_limit,
    'answered_count', v_round.answered_count,
    'correct_count', v_round.correct_count
  );
end;
$$;

create or replace function public.next_child_multiplication_question(
  p_session_token uuid,
  p_round_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_round public.multiplication_rounds%rowtype;
  v_stage public.multiplication_stage_progress%rowtype;
  v_existing public.multiplication_question_attempts%rowtype;
  v_multiplier integer;
  v_correct integer;
  v_options jsonb;
  v_attempt_id uuid;
begin
  select student_id into v_student_id from public.child_sessions
  where session_token = p_session_token and expires_at > now() and revoked_at is null;
  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;

  select * into v_round from public.multiplication_rounds
  where id = p_round_id and student_id = v_student_id and status = 'active';
  if v_round.id is null then raise exception 'الجولة غير متاحة'; end if;

  select * into v_existing from public.multiplication_question_attempts
  where round_id = v_round.id and answered_at is null
  order by created_at desc limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'attempt_id', v_existing.id,
      'table_number', v_existing.table_number,
      'multiplier', v_existing.multiplier,
      'options', v_existing.answer_options,
      'answered_count', v_round.answered_count,
      'question_limit', v_round.question_limit
    );
  end if;

  if v_round.answered_count >= v_round.question_limit then
    raise exception 'اكتملت أسئلة الجولة';
  end if;
  select * into v_stage from public.multiplication_stage_progress where id = v_round.stage_id;

  select g into v_multiplier from generate_series(1, 10) as g
  where not exists (
    select 1 from public.multiplication_question_attempts a
    where a.round_id = v_round.id and a.multiplier = g
  ) order by random() limit 1;

  if v_multiplier is null then v_multiplier := floor(random() * 10 + 1)::integer; end if;
  v_correct := v_stage.table_number * v_multiplier;

  select jsonb_agg(option_value order by random()) into v_options
  from unnest(array[
    v_correct,
    v_correct + v_stage.table_number,
    greatest(0, v_correct - v_stage.table_number),
    v_correct + (v_stage.table_number * 2)
  ]) as options(option_value);

  insert into public.multiplication_question_attempts(
    round_id, program_id, student_id, table_number, multiplier,
    correct_answer, answer_options
  ) values (
    v_round.id, v_round.program_id, v_student_id,
    v_stage.table_number, v_multiplier, v_correct, v_options
  ) returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'table_number', v_stage.table_number,
    'multiplier', v_multiplier,
    'options', v_options,
    'answered_count', v_round.answered_count,
    'question_limit', v_round.question_limit
  );
end;
$$;
