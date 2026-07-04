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
        update public.tasks
        set status = 'approved', submitted_at = coalesce(submitted_at, now()), approved_at = now(),
            review_note = 'تم التحقق آليًا من اجتياز جميع مراحل جدول الضرب.', updated_at = now()
        where id = v_task.id;

        if v_task.achievement_points > 0 then
          insert into public.points_ledger(organization_id, student_id, source_type, source_id, point_type, points, note, created_by)
          values (v_task.organization_id, v_task.student_id, 'multiplication_program', v_program.id, 'achievement', v_task.achievement_points, 'إتقان جدول الضرب كاملًا', null)
          on conflict do nothing;
        end if;
        if v_task.reward_points > 0 then
          insert into public.points_ledger(organization_id, student_id, source_type, source_id, point_type, points, note, created_by)
          values (v_task.organization_id, v_task.student_id, 'multiplication_program', v_program.id, 'reward', v_task.reward_points, 'إتقان جدول الضرب كاملًا', null)
          on conflict do nothing;
        end if;

        update public.students s
        set achievement_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
            reward_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'reward'), 0),
            points_balance = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
            updated_at = now()
        where s.id = v_task.student_id;

        insert into public.child_notifications(organization_id, student_id, notification_type, title, body, icon, action_type, action_id, source_key, metadata)
        values (v_task.organization_id, v_task.student_id, 'achievement', 'أصبحت بطل جدول الضرب!',
          'أتممت جميع المراحل بنجاح وأصبحت مهمتك جاهزة للتكريم من ولي الأمر.', '🏆',
          'multiplication_program', v_program.id, 'multiplication-completed:' || v_program.id::text,
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

revoke all on public.multiplication_programs from anon, authenticated;
revoke all on public.multiplication_stage_progress from anon, authenticated;
revoke all on public.multiplication_rounds from anon, authenticated;
revoke all on public.multiplication_question_attempts from anon, authenticated;
grant execute on function public.assign_multiplication_program(uuid, integer, integer, integer, integer, integer, integer, date) to authenticated;
grant execute on function public.get_multiplication_programs_for_student(uuid) to authenticated;
grant execute on function public.delete_multiplication_program(uuid) to authenticated;
grant execute on function public.get_child_multiplication_programs(uuid) to anon, authenticated;
grant execute on function public.get_child_multiplication_program(uuid, uuid) to anon, authenticated;
grant execute on function public.start_child_multiplication_stage(uuid, uuid, integer) to anon, authenticated;
grant execute on function public.next_child_multiplication_question(uuid, uuid) to anon, authenticated;
grant execute on function public.answer_child_multiplication_question(uuid, uuid, integer) to anon, authenticated;
