create or replace function public.parent_update_task_description(
  p_task_id uuid,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_plan_mode text;
  v_description text := nullif(trim(p_description), '');
  v_period_label text;
begin
  select t.* into v_task
  from public.tasks t
  where t.id = p_task_id
  for update;

  if v_task.id is null then
    raise exception 'المهمة غير موجودة';
  end if;

  if not public.is_organization_owner(v_task.organization_id) then
    raise exception 'غير مصرح لك بتعديل هذه المهمة';
  end if;

  if v_task.status in ('submitted', 'approved') then
    raise exception 'لا يمكن تعديل وصف مهمة مرسلة أو معتمدة';
  end if;

  if v_description is null or char_length(v_description) < 3 then
    raise exception 'اكتب وصفًا واضحًا للمهمة';
  end if;

  if v_task.goal_id is not null then
    select g.task_plan_mode into v_plan_mode
    from public.goals g
    where g.id = v_task.goal_id;
  end if;

  if v_description not like 'المطلوب منك%' then
    v_period_label := case
      when v_plan_mode = 'weekly' and v_task.plan_step is not null then format('الأسبوع %s من %s', v_task.plan_step, v_task.plan_total)
      when v_plan_mode = 'daily' and v_task.plan_step is not null then format('اليوم %s من %s', v_task.plan_step, v_task.plan_total)
      when v_plan_mode = 'milestones' and v_task.plan_step is not null then format('المرحلة %s من %s', v_task.plan_step, v_task.plan_total)
      else 'هذه المهمة'
    end;

    v_description := format('المطلوب منك في %s: %s', v_period_label, v_description);
  end if;

  update public.tasks
  set description = v_description,
      updated_at = now()
  where id = p_task_id;
end;
$$;

revoke execute on function public.parent_update_task_description(uuid,text) from public;
revoke execute on function public.parent_update_task_description(uuid,text) from anon;
grant execute on function public.parent_update_task_description(uuid,text) to authenticated;
