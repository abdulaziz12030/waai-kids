-- Restrict internal trigger/helper functions from direct REST execution.
-- Trigger execution itself is unaffected by EXECUTE grants.

revoke execute on function public.notify_child_gift_event() from public, anon, authenticated;
revoke execute on function public.notify_child_goal_event() from public, anon, authenticated;
revoke execute on function public.notify_child_quran_review_event() from public, anon, authenticated;
revoke execute on function public.notify_child_task_event() from public, anon, authenticated;
revoke execute on function public.ensure_memorization_plan_goal() from public, anon, authenticated;
revoke execute on function public.sync_memorization_goal_after_segment() from public, anon, authenticated;
revoke execute on function public.child_notification_actor_label(uuid, uuid) from public, anon, authenticated;
