create or replace function public.convert_goal_to_task_plan_v2(
  p_goal_id uuid,
  p_start_date date,
  p_due_date date,
  p_split_mode text default 'weekly',
  p_installments integer default 4,
  p_title_prefix text default null,
  p_category text default 'other',
  p_difficulty text default 'medium',
  p_points_mode text default 'automatic',
  p_achievement_points integer default 10,
  p_reward_points integer default 1,
  p_review_note text default null,
  p_step_descriptions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_batch_id uuid;
  v_mode text := lower(coalesce(trim(p_split_mode), 'weekly'));
  v_item record;
  v_period_label text;
  v_custom_count integer := 0;
begin
  if p_step_descriptions is null then
    p_step_descriptions := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_step_descriptions) <> 'array' then
    raise exception 'أوصاف أجزاء الخطة يجب أن تكون قائمة';
  end if;

  v_result := public.convert_goal_to_task_plan(
    p_goal_id,
    p_start_date,
    p_due_date,
    p_split_mode,
    p_installments,
    p_title_prefix,
    p_category,
    p_difficulty,
    p_points_mode,
    p_achievement_points,
    p_reward_points,
    p_review_note
  );

  v_batch_id := nullif(v_result->>'plan_batch_id', '')::uuid;

  if v_batch_id is not null then
    for v_item in
      select ordinality::integer as step_number, value as description
      from jsonb_array_elements_text(p_step_descriptions) with ordinality
    loop
      if nullif(trim(v_item.description), '') is null then
        continue;
      end if;

      select case
        when v_mode = 'weekly' then format('الأسبوع %s من %s', t.plan_step, t.plan_total)
        when v_mode = 'daily' then format('اليوم %s من %s', t.plan_step, t.plan_total)
        when v_mode = 'milestones' then format('المرحلة %s من %s', t.plan_step, t.plan_total)
        else 'هذه المهمة'
      end
      into v_period_label
      from public.tasks t
      where t.plan_batch_id = v_batch_id
        and t.plan_step = v_item.step_number;

      if v_period_label is not null then
        update public.tasks t
        set description = format('المطلوب منك في %s: %s', v_period_label, trim(v_item.description)),
            updated_at = now()
        where t.plan_batch_id = v_batch_id
          and t.plan_step = v_item.step_number;

        v_custom_count := v_custom_count + 1;
      end if;
    end loop;
  end if;

  return v_result || jsonb_build_object('custom_descriptions_count', v_custom_count);
end;
$$;

revoke execute on function public.convert_goal_to_task_plan_v2(uuid,date,date,text,integer,text,text,text,text,integer,integer,text,jsonb) from public;
revoke execute on function public.convert_goal_to_task_plan_v2(uuid,date,date,text,integer,text,text,text,text,integer,integer,text,jsonb) from anon;
grant execute on function public.convert_goal_to_task_plan_v2(uuid,date,date,text,integer,text,text,text,text,integer,integer,text,jsonb) to authenticated;
