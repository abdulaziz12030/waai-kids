revoke execute on function public.parent_delete_child_task(uuid) from public;
revoke execute on function public.parent_delete_child_task(uuid) from anon;
grant execute on function public.parent_delete_child_task(uuid) to authenticated;
