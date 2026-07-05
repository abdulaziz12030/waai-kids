alter table public.child_notifications
  drop constraint if exists child_notifications_notification_type_check;

alter table public.child_notifications
  add constraint child_notifications_notification_type_check
  check (notification_type = any (array[
    'gift'::text,
    'recognition'::text,
    'guardian_reply'::text,
    'teacher_reply'::text,
    'task'::text,
    'task_assigned'::text,
    'achievement'::text,
    'goal'::text,
    'quran'::text,
    'general'::text
  ]));
