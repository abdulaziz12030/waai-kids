create or replace function public.describe_goal_plan_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.task_plan_mode is null then
    return new;
  end if;

  update public.tasks t
  set description = case
        when nullif(trim(new.decision_note), '') is not null then
          format(
            'المطلوب منك في %s: %s',
            case
              when new.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
              else 'هذه المهمة'
            end,
            trim(new.decision_note)
          )
        when new.goal_type::text = 'educational' then
          format(
            'المطلوب منك في %s: أنجز الجزء المتفق عليه من التعلّم أو التدريب الذي يقربك من هدف «%s»، ثم دوّن ما أنجزته وأرسله لولي الأمر للمراجعة.',
            case
              when new.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
              else 'هذه المهمة'
            end,
            coalesce(nullif(trim(new.title), ''), 'هدفك')
          )
        when new.goal_type::text = 'behavioral' then
          format(
            'المطلوب منك في %s: التزم بالسلوك المتفق عليه طوال الفترة بما يقربك من هدف «%s»، ثم سجّل مدى التزامك وأرسله لولي الأمر للمراجعة.',
            case
              when new.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
              else 'هذه المهمة'
            end,
            coalesce(nullif(trim(new.title), ''), 'هدفك')
          )
        else
          format(
            'المطلوب منك في %s: نفّذ المهمة المتفق عليها التي تقربك من هدف «%s»، ثم اكتب ما أنجزته وأرسله لولي الأمر للمراجعة.',
            case
              when new.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
              when new.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
              else 'هذه المهمة'
            end,
            coalesce(nullif(trim(new.title), ''), 'هدفك')
          )
      end,
      updated_at = now()
  where t.goal_id = new.id
    and t.generated_from_goal = true
    and (
      t.description is null
      or nullif(trim(t.description), '') is null
      or t.description = old.description
      or t.description = new.description
      or t.description not like 'المطلوب منك%'
    );

  return new;
end;
$$;

drop trigger if exists goals_describe_generated_plan_tasks on public.goals;
create trigger goals_describe_generated_plan_tasks
after update of task_plan_mode, decision_note, goal_type, title on public.goals
for each row
when (new.task_plan_mode is not null)
execute function public.describe_goal_plan_tasks();

update public.tasks t
set description = case
      when nullif(trim(g.decision_note), '') is not null then
        format(
          'المطلوب منك في %s: %s',
          case
            when g.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
            else 'هذه المهمة'
          end,
          trim(g.decision_note)
        )
      when g.goal_type::text = 'educational' then
        format(
          'المطلوب منك في %s: أنجز الجزء المتفق عليه من التعلّم أو التدريب الذي يقربك من هدف «%s»، ثم دوّن ما أنجزته وأرسله لولي الأمر للمراجعة.',
          case
            when g.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
            else 'هذه المهمة'
          end,
          coalesce(nullif(trim(g.title), ''), 'هدفك')
        )
      when g.goal_type::text = 'behavioral' then
        format(
          'المطلوب منك في %s: التزم بالسلوك المتفق عليه طوال الفترة بما يقربك من هدف «%s»، ثم سجّل مدى التزامك وأرسله لولي الأمر للمراجعة.',
          case
            when g.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
            else 'هذه المهمة'
          end,
          coalesce(nullif(trim(g.title), ''), 'هدفك')
        )
      else
        format(
          'المطلوب منك في %s: نفّذ المهمة المتفق عليها التي تقربك من هدف «%s»، ثم اكتب ما أنجزته وأرسله لولي الأمر للمراجعة.',
          case
            when g.task_plan_mode = 'weekly' and t.plan_step is not null then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'daily' and t.plan_step is not null then format('اليوم %s من %s', t.plan_step, t.plan_total)
            when g.task_plan_mode = 'milestones' and t.plan_step is not null then format('المرحلة %s من %s', t.plan_step, t.plan_total)
            else 'هذه المهمة'
          end,
          coalesce(nullif(trim(g.title), ''), 'هدفك')
        )
    end,
    updated_at = now()
from public.goals g
where g.id = t.goal_id
  and t.generated_from_goal = true
  and g.task_plan_mode is not null
  and (
    t.description is null
    or nullif(trim(t.description), '') is null
    or t.description = g.description
    or t.description not like 'المطلوب منك%'
  );

revoke execute on function public.describe_goal_plan_tasks() from public, anon, authenticated;
