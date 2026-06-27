create or replace function public.parent_delete_child_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_goal public.goals%rowtype;
  v_remaining integer := 0;
  v_approved integer := 0;
  v_progress integer := 0;
  v_goal_completed boolean := false;
begin
  select t.* into v_task
  from public.tasks t
  where t.id = p_task_id
  for update;

  if v_task.id is null then
    raise exception 'المهمة غير موجودة';
  end if;

  if not public.is_organization_owner(v_task.organization_id) then
    raise exception 'غير مصرح لك بحذف هذه المهمة';
  end if;

  if v_task.status = 'approved' then
    raise exception 'لا يمكن حذف مهمة معتمدة لأنها أضافت نقاطًا للطفل';
  end if;

  if v_task.goal_id is not null then
    select g.* into v_goal
    from public.goals g
    where g.id = v_task.goal_id
    for update;

    if exists (
      select 1
      from public.rewards r
      where r.goal_id = v_task.goal_id
        and r.status = 'paid'
    ) then
      raise exception 'لا يمكن حذف مهمة من هدف تم منح مكافأته';
    end if;
  end if;

  delete from public.tasks where id = p_task_id;

  if v_task.plan_batch_id is not null then
    with reordered as (
      select
        t.id,
        row_number() over (
          order by t.plan_step nulls last, t.starts_on nulls first, t.created_at
        )::integer as new_step,
        count(*) over ()::integer as new_total
      from public.tasks t
      where t.plan_batch_id = v_task.plan_batch_id
    )
    update public.tasks t
    set plan_step = r.new_step,
        plan_total = r.new_total,
        updated_at = now()
    from reordered r
    where t.id = r.id;
  end if;

  if v_task.goal_id is not null then
    select
      count(*),
      count(*) filter (where t.status = 'approved')
    into v_remaining, v_approved
    from public.tasks t
    where t.goal_id = v_task.goal_id;

    if v_remaining > 0 then
      v_progress := floor((v_approved::numeric / v_remaining::numeric) * 100)::integer;
      v_goal_completed := v_approved = v_remaining;

      update public.goals
      set task_plan_count = v_remaining,
          progress = v_progress,
          status = case
            when v_goal_completed then 'completed'::goal_status
            when status = 'paused' then status
            else 'approved'::goal_status
          end,
          updated_at = now()
      where id = v_task.goal_id;

      if v_goal_completed then
        insert into public.rewards(
          organization_id,
          goal_id,
          student_id,
          title,
          reward_type,
          amount,
          points_required,
          status,
          due_date,
          created_by
        ) values (
          v_goal.organization_id,
          v_goal.id,
          v_goal.student_id,
          coalesce(nullif(trim(v_goal.title), ''), 'مكافأة إكمال الهدف'),
          'goal_reward',
          v_goal.target_value,
          v_goal.required_points,
          'due',
          current_date,
          auth.uid()
        )
        on conflict (goal_id) do update
        set status = case
              when public.rewards.status = 'paid' then public.rewards.status
              else 'due'::reward_status
            end,
            amount = excluded.amount,
            points_required = excluded.points_required,
            due_date = excluded.due_date,
            updated_at = now();
      end if;
    else
      update public.goals
      set task_plan_count = 0,
          task_plan_mode = null,
          converted_to_tasks_at = null,
          progress = 0,
          status = 'approved'::goal_status,
          updated_at = now()
      where id = v_task.goal_id;

      delete from public.rewards
      where goal_id = v_task.goal_id
        and status <> 'paid';
    end if;
  end if;

  return jsonb_build_object(
    'deleted_task_id', p_task_id,
    'goal_id', v_task.goal_id,
    'remaining_tasks', v_remaining,
    'goal_completed', v_goal_completed
  );
end;
$$;
