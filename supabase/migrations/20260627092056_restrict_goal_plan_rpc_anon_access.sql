do $migration$
begin
  execute 'revoke execute on function public.review_child_goal(uuid, text, text, date, date) from anon';
  execute 'revoke execute on function public.convert_goal_to_task_plan(uuid, date, date, text, integer, text, text, text, text, integer, integer, text) from anon';
end
$migration$;
