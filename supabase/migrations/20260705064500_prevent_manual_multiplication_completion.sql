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

  if exists (
    select 1
    from public.multiplication_programs mp
    where mp.task_id = v_task.id
      and mp.student_id = v_student_id
      and mp.status <> 'cancelled'
  ) then
    raise exception 'لا يمكن إتمام مهمة جدول الضرب يدويًا؛ أكمل جميع مراحل التحدي وسيتم اعتمادها تلقائيًا';
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
