-- Restrict anonymous access to parent/teacher/admin RPCs.
-- Child session RPCs that intentionally use p_session_token remain callable by anon.

revoke execute on function public.create_quran_scheduled_plan(uuid, text, integer, date, integer, integer, integer, text) from anon;
revoke execute on function public.generate_family_code() from anon;
revoke execute on function public.get_quran_plan_segments_shared(uuid) from anon;
revoke execute on function public.get_student_quran_plans_shared(uuid) from anon;
revoke execute on function public.is_active_teacher_for_student(uuid) from anon;
revoke execute on function public.parent_sync_student_balance(uuid) from anon;
revoke execute on function public.parent_zero_student_points(uuid) from anon;
revoke execute on function public.refresh_memorization_goal_progress(uuid) from anon;
revoke execute on function public.teacher_add_quran_segment(uuid, integer, integer, integer, text, integer, text) from anon;
revoke execute on function public.teacher_delete_quran_segment(uuid) from anon;
