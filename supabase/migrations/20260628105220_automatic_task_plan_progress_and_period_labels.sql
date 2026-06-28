create or replace function public.refresh_goal_progress_from_tasks(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_approved integer := 0;
  v_progress integer := 0;
begin
  if p_goal_id is null then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where t.status = 'approved')::integer
  into v_total, v_approved
  from public.tasks t
  where t.goal_id = p_goal_id;

  if v_total > 0 then
    v_progress := floor((v_approved::numeric / v_total::numeric) * 100)::integer;
  end if;

  update public.goals g
  set task_plan_count = v_total,
      progress = greatest(0, least(100, v_progress)),
      status = case
        when v_total > 0 and v_approved = v_total then 'completed'::goal_status
        when g.status = 'completed' and (v_total = 0 or v_approved < v_total) then 'approved'::goal_status
        else g.status
      end,
      updated_at = now()
  where g.id = p_goal_id;
end;
$$;

create or replace function public.sync_goal_progress_after_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_goal_progress_from_tasks(old.goal_id);
    return old;
  end if;

  if tg_op = 'INSERT' then
    perform public.refresh_goal_progress_from_tasks(new.goal_id);
    return new;
  end if;

  if old.goal_id is distinct from new.goal_id then
    perform public.refresh_goal_progress_from_tasks(old.goal_id);
  end if;

  if old.goal_id is distinct from new.goal_id
     or old.status is distinct from new.status then
    perform public.refresh_goal_progress_from_tasks(new.goal_id);
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_sync_goal_progress on public.tasks;
create trigger tasks_sync_goal_progress
after insert or delete or update of status, goal_id on public.tasks
for each row execute function public.sync_goal_progress_after_task_change();

create or replace function public.label_goal_plan_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_word text;
begin
  v_period_word := case new.task_plan_mode
    when 'weekly' then 'الأسبوع'
    when 'daily' then 'اليوم'
    else 'المرحلة'
  end;

  update public.tasks t
  set title = regexp_replace(
        t.title,
        '\s+—\s+المرحلة\s+[0-9]+\s+من\s+[0-9]+$',
        format(' — %s %s من %s', v_period_word, t.plan_step, t.plan_total)
      ),
      updated_at = now()
  where t.goal_id = new.id
    and t.generated_from_goal = true
    and t.plan_step is not null
    and t.plan_total is not null
    and t.plan_total > 1;

  return new;
end;
$$;

drop trigger if exists goals_label_generated_plan_tasks on public.goals;
create trigger goals_label_generated_plan_tasks
after insert or update of task_plan_mode, task_plan_count on public.goals
for each row
when (new.task_plan_mode is not null)
execute function public.label_goal_plan_tasks();

update public.tasks t
set title = regexp_replace(
      t.title,
      '\s+—\s+المرحلة\s+[0-9]+\s+من\s+[0-9]+$',
      format(
        ' — %s %s من %s',
        case g.task_plan_mode when 'weekly' then 'الأسبوع' when 'daily' then 'اليوم' else 'المرحلة' end,
        t.plan_step,
        t.plan_total
      )
    ),
    updated_at = now()
from public.goals g
where g.id = t.goal_id
  and t.generated_from_goal = true
  and t.plan_step is not null
  and t.plan_total is not null
  and t.plan_total > 1;

do $$
declare
  v_goal_id uuid;
begin
  for v_goal_id in
    select distinct t.goal_id
    from public.tasks t
    where t.goal_id is not null
  loop
    perform public.refresh_goal_progress_from_tasks(v_goal_id);
  end loop;
end;
$$;

revoke execute on function public.refresh_goal_progress_from_tasks(uuid) from public, anon, authenticated;
revoke execute on function public.sync_goal_progress_after_task_change() from public, anon, authenticated;
revoke execute on function public.label_goal_plan_tasks() from public, anon, authenticated;
