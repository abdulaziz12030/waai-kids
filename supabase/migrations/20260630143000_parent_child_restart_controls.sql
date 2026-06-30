create or replace function public.parent_zero_student_achievement_points(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_previous_points integer := 0;
  v_updated_entries integer := 0;
begin
  select s.* into v_student from public.students s where s.id = p_student_id for update;
  if v_student.id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.is_organization_owner(v_student.organization_id) then raise exception 'غير مصرح لك بتصفير نقاط هذا الطفل'; end if;

  v_previous_points := coalesce(v_student.achievement_points, 0);
  update public.points_ledger
  set points = 0,
      note = trim(both ' ' from concat_ws(' · ', nullif(note, ''), 'تم تصفير نقاط الإنجاز بواسطة ولي الأمر'))
  where student_id = p_student_id and point_type = 'achievement' and points <> 0;
  get diagnostics v_updated_entries = row_count;

  update public.students
  set achievement_points = 0, points_balance = 0, updated_at = now()
  where id = p_student_id;

  return jsonb_build_object(
    'previous_achievement_points', v_previous_points,
    'updated_entries', v_updated_entries,
    'achievement_points', 0,
    'reward_points', coalesce(v_student.reward_points, 0)
  );
end;
$$;

create or replace function public.parent_delete_all_student_goals(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_goal_count integer := 0;
  v_task_count integer := 0;
  v_reward_count integer := 0;
  v_point_entries integer := 0;
begin
  select s.* into v_student from public.students s where s.id = p_student_id for update;
  if v_student.id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.is_organization_owner(v_student.organization_id) then raise exception 'غير مصرح لك بحذف أهداف هذا الطفل'; end if;

  select count(*)::integer into v_goal_count from public.goals where student_id = p_student_id;
  select count(*)::integer into v_task_count from public.tasks where student_id = p_student_id and goal_id is not null;

  delete from public.points_ledger pl
  using public.tasks t
  where t.student_id = p_student_id and t.goal_id is not null
    and pl.source_type = 'task' and pl.source_id = t.id;
  get diagnostics v_point_entries = row_count;

  delete from public.rewards r where r.student_id = p_student_id and r.goal_id is not null;
  get diagnostics v_reward_count = row_count;
  delete from public.goals where student_id = p_student_id;

  update public.students s
  set achievement_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
      reward_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'reward'), 0),
      points_balance = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
      updated_at = now()
  where s.id = p_student_id;

  return jsonb_build_object(
    'deleted_goals', v_goal_count,
    'deleted_linked_tasks', v_task_count,
    'deleted_goal_rewards', v_reward_count,
    'removed_point_entries', v_point_entries
  );
end;
$$;

create or replace function public.delete_quran_plan_shared(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_organization_id uuid;
begin
  select qp.student_id, qp.organization_id into v_student_id, v_organization_id
  from public.quran_plans qp where qp.id = p_plan_id;
  if v_student_id is null then raise exception 'خطة الحفظ غير موجودة'; end if;
  if not public.is_active_teacher_for_student(v_student_id)
     and not public.is_organization_owner(v_organization_id) then
    raise exception 'غير مصرح لك بحذف خطة الحفظ';
  end if;

  delete from public.points_ledger pl
  using public.quran_segments qs
  where pl.source_id = qs.id and qs.plan_id = p_plan_id and pl.source_type = 'quran_segment';
  delete from public.quran_plans where id = p_plan_id;

  update public.students s
  set achievement_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
      reward_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'reward'), 0),
      points_balance = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
      updated_at = now()
  where s.id = v_student_id;
end;
$$;

create or replace function public.reset_student_quran_program_shared(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_plan_count integer := 0;
  v_segment_count integer := 0;
  v_audio_count integer := 0;
  v_recitation_count integer := 0;
  v_point_entries integer := 0;
begin
  select s.* into v_student from public.students s where s.id = p_student_id for update;
  if v_student.id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.is_active_teacher_for_student(p_student_id)
     and not public.is_organization_owner(v_student.organization_id) then
    raise exception 'غير مصرح لك بإعادة برنامج الحفظ';
  end if;

  select count(*)::integer into v_plan_count from public.quran_plans where student_id = p_student_id;
  select count(*)::integer into v_segment_count from public.quran_segments qs join public.quran_plans qp on qp.id = qs.plan_id where qp.student_id = p_student_id;
  select count(*)::integer into v_audio_count from public.quran_audio_submissions qa join public.quran_segments qs on qs.id = qa.segment_id join public.quran_plans qp on qp.id = qs.plan_id where qp.student_id = p_student_id;
  select count(*)::integer into v_recitation_count from public.quran_recitations qr join public.quran_segments qs on qs.id = qr.segment_id join public.quran_plans qp on qp.id = qs.plan_id where qp.student_id = p_student_id;

  delete from public.points_ledger pl
  using public.quran_segments qs, public.quran_plans qp
  where pl.source_id = qs.id and qs.plan_id = qp.id and qp.student_id = p_student_id and pl.source_type = 'quran_segment';
  get diagnostics v_point_entries = row_count;
  delete from public.quran_plans where student_id = p_student_id;

  update public.students s
  set achievement_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
      reward_points = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'reward'), 0),
      points_balance = coalesce((select sum(pl.points) from public.points_ledger pl where pl.student_id = s.id and pl.point_type = 'achievement'), 0),
      updated_at = now()
  where s.id = p_student_id;

  return jsonb_build_object(
    'deleted_plans', v_plan_count,
    'deleted_segments', v_segment_count,
    'deleted_audio_submissions', v_audio_count,
    'deleted_recitations', v_recitation_count,
    'removed_point_entries', v_point_entries
  );
end;
$$;

revoke all on function public.parent_zero_student_achievement_points(uuid) from public;
revoke all on function public.parent_delete_all_student_goals(uuid) from public;
revoke all on function public.delete_quran_plan_shared(uuid) from public;
revoke all on function public.reset_student_quran_program_shared(uuid) from public;
grant execute on function public.parent_zero_student_achievement_points(uuid) to authenticated;
grant execute on function public.parent_delete_all_student_goals(uuid) to authenticated;
grant execute on function public.delete_quran_plan_shared(uuid) to authenticated;
grant execute on function public.reset_student_quran_program_shared(uuid) to authenticated;
