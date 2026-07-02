-- Final hardening: remove inherited PUBLIC execution from privileged RPCs.
-- Keep current child session RPCs available to anon; retire the unused legacy child login RPC.

revoke execute on function public.authenticate_child(text, text, text) from public, anon, authenticated;

revoke execute on function public.create_religious_science_plan(uuid, text, date, integer, integer, integer, text, boolean) from public, anon;
grant execute on function public.create_religious_science_plan(uuid, text, date, integer, integer, integer, text, boolean) to authenticated;

revoke execute on function public.parent_create_quran_scheduled_plan(uuid, text, integer, date, integer, integer, integer, text) from public, anon;
grant execute on function public.parent_create_quran_scheduled_plan(uuid, text, integer, date, integer, integer, integer, text) to authenticated;

revoke execute on function public.parent_sync_student_balance(uuid) from public, anon;
grant execute on function public.parent_sync_student_balance(uuid) to authenticated;

revoke execute on function public.parent_zero_student_points(uuid) from public, anon;
grant execute on function public.parent_zero_student_points(uuid) to authenticated;

revoke execute on function public.refresh_memorization_goal_progress(uuid) from public, anon;
grant execute on function public.refresh_memorization_goal_progress(uuid) to authenticated;
