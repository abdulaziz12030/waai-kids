create or replace function public.parent_delete_goal_completely(p_goal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals%rowtype;
  v_task_count integer := 0;
  v_approved_count integer := 0;
  v_point_entries integer := 0;
  v_reward_count integer := 0;
begin
  select g.* into v_goal
  from public.goals g
  where g.id = p_goal_id
  for update;

  if v_goal.id is null then
    raise exception 'الهدف غير موجود';
  end if;

  if not public.is_organization_owner(v_goal.organization_id) then
    raise exception 'غير مصرح لك بحذف هذا الهدف';
  end if;

  select
    count(*),
    count(*) filter (where t.status = 'approved')
  into v_task_count, v_approved_count
  from public.tasks t
  where t.goal_id = p_goal_id;

  delete from public.points_ledger pl
  using public.tasks t
  where t.goal_id = p_goal_id
    and pl.source_type = 'task'
    and pl.source_id = t.id;
  get diagnostics v_point_entries = row_count;

  delete from public.rewards r
  where r.goal_id = p_goal_id;
  get diagnostics v_reward_count = row_count;

  delete from public.goals g
  where g.id = p_goal_id;

  update public.students s
  set achievement_points = coalesce((
        select sum(pl.points)
        from public.points_ledger pl
        where pl.student_id = s.id
          and pl.point_type = 'achievement'
      ), 0),
      reward_points = coalesce((
        select sum(pl.points)
        from public.points_ledger pl
        where pl.student_id = s.id
          and pl.point_type = 'reward'
      ), 0),
      points_balance = coalesce((
        select sum(pl.points)
        from public.points_ledger pl
        where pl.student_id = s.id
          and pl.point_type = 'achievement'
      ), 0),
      updated_at = now()
  where s.id = v_goal.student_id;

  return jsonb_build_object(
    'deleted_goal_id', p_goal_id,
    'deleted_tasks', v_task_count,
    'approved_tasks', v_approved_count,
    'removed_point_entries', v_point_entries,
    'deleted_rewards', v_reward_count
  );
end;
$$;

revoke execute on function public.parent_delete_goal_completely(uuid) from public;
revoke execute on function public.parent_delete_goal_completely(uuid) from anon;
grant execute on function public.parent_delete_goal_completely(uuid) to authenticated;
