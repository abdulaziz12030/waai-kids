-- Phase 1: simplification and stability
-- Add covering indexes for foreign keys reported by Supabase performance advisors.

create index if not exists child_gifts_gift_catalog_id_idx on public.child_gifts (gift_catalog_id);
create index if not exists child_gifts_goal_id_idx on public.child_gifts (goal_id);
create index if not exists child_gifts_task_id_idx on public.child_gifts (task_id);
create index if not exists child_notifications_organization_id_idx on public.child_notifications (organization_id);
create index if not exists coin_purchase_orders_package_id_idx on public.coin_purchase_orders (package_id);
create index if not exists family_coin_ledger_child_gift_id_idx on public.family_coin_ledger (child_gift_id);
create index if not exists quran_plans_assigned_by_idx on public.quran_plans (assigned_by);
create index if not exists quran_plans_catalog_item_id_idx on public.quran_plans (catalog_item_id);
create index if not exists quran_plans_goal_id_idx on public.quran_plans (goal_id);
create index if not exists quran_recitations_reviewer_id_idx on public.quran_recitations (reviewer_id);
create index if not exists religious_science_units_chapter_id_idx on public.religious_science_units (chapter_id);
create index if not exists reward_deferrals_requested_by_idx on public.reward_deferrals (requested_by);
create index if not exists reward_deferrals_reward_id_idx on public.reward_deferrals (reward_id);
create index if not exists rewards_created_by_idx on public.rewards (created_by);
create index if not exists rewards_granted_by_idx on public.rewards (granted_by);
create index if not exists rewards_organization_id_idx on public.rewards (organization_id);
create index if not exists rewards_student_id_idx on public.rewards (student_id);
create index if not exists students_guardian_user_id_idx on public.students (guardian_user_id);
create index if not exists students_linked_user_id_idx on public.students (linked_user_id);
create index if not exists subscriptions_organization_id_idx on public.subscriptions (organization_id);
create index if not exists tasks_approved_by_idx on public.tasks (approved_by);
create index if not exists tasks_assigned_by_idx on public.tasks (assigned_by);
create index if not exists teacher_student_links_created_by_idx on public.teacher_student_links (created_by);
