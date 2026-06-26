create or replace function public.delete_quran_plan_shared(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_reversed_points integer := 0;
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

  select coalesce(sum(pl.points), 0)::integer
  into v_reversed_points
  from public.points_ledger pl
  join public.quran_segments qs on qs.id = pl.source_id
  where qs.plan_id = p_plan_id
    and pl.source_type = 'quran_segment'
    and pl.point_type = 'achievement';

  if v_reversed_points > 0 then
    update public.students
    set achievement_points = greatest(achievement_points - v_reversed_points, 0),
        points_balance = greatest(points_balance - v_reversed_points, 0),
        updated_at = now()
    where id = v_student_id;
  end if;

  delete from public.points_ledger pl
  using public.quran_segments qs
  where pl.source_id = qs.id
    and qs.plan_id = p_plan_id
    and pl.source_type = 'quran_segment';

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

create or replace function public.reset_student_quran_program_shared(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_plan_count integer := 0;
  v_reversed_points integer := 0;
begin
  if not public.is_active_teacher_for_student(p_student_id) then
    raise exception 'إعادة برنامج الحفظ من صلاحية المعلم المرتبط';
  end if;

  select count(*)::integer into v_plan_count
  from public.quran_plans
  where student_id = p_student_id;

  select coalesce(sum(pl.points), 0)::integer
  into v_reversed_points
  from public.points_ledger pl
  join public.quran_segments qs on qs.id = pl.source_id
  join public.quran_plans qp on qp.id = qs.plan_id
  where qp.student_id = p_student_id
    and pl.source_type = 'quran_segment'
    and pl.point_type = 'achievement';

  if v_reversed_points > 0 then
    update public.students
    set achievement_points = greatest(achievement_points - v_reversed_points, 0),
        points_balance = greatest(points_balance - v_reversed_points, 0),
        updated_at = now()
    where id = p_student_id;
  end if;

  delete from public.points_ledger pl
  using public.quran_segments qs, public.quran_plans qp
  where pl.source_id = qs.id
    and qs.plan_id = qp.id
    and qp.student_id = p_student_id
    and pl.source_type = 'quran_segment';

  delete from public.quran_audio_submissions qa
  using public.quran_segments qs, public.quran_plans qp
  where qa.segment_id = qs.id
    and qs.plan_id = qp.id
    and qp.student_id = p_student_id;

  delete from public.quran_recitations qr
  using public.quran_segments qs, public.quran_plans qp
  where qr.segment_id = qs.id
    and qs.plan_id = qp.id
    and qp.student_id = p_student_id;

  delete from public.quran_segments qs
  using public.quran_plans qp
  where qs.plan_id = qp.id
    and qp.student_id = p_student_id;

  delete from public.quran_plans where student_id = p_student_id;

  return jsonb_build_object('deleted_plans', v_plan_count, 'reversed_points', v_reversed_points);
end;
$function$;

revoke all on function public.delete_quran_plan_shared(uuid) from public;
revoke all on function public.reset_student_quran_program_shared(uuid) from public;
grant execute on function public.delete_quran_plan_shared(uuid) to authenticated;
grant execute on function public.reset_student_quran_program_shared(uuid) to authenticated;
