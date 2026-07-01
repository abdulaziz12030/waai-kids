-- Phase 1: RLS performance cleanup.
-- Cache auth.uid() calls and split broad ALL policies so SELECT has one clear path.

alter policy "profiles self read" on public.profiles using (id = (select auth.uid()));
alter policy "profiles self update" on public.profiles using (id = (select auth.uid()));
alter policy "profiles self insert" on public.profiles with check (id = (select auth.uid()));

alter policy "organizations_select" on public.organizations using ((owner_id = (select auth.uid())) or is_organization_member(id));
alter policy "organizations_insert" on public.organizations with check (owner_id = (select auth.uid()));
alter policy "organizations_update" on public.organizations using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "organizations_delete" on public.organizations using (owner_id = (select auth.uid()));

alter policy "memberships_select" on public.memberships using ((user_id = (select auth.uid())) or is_organization_owner(organization_id));

alter policy "goals_insert_family_owner" on public.goals
  with check (
    is_organization_owner(organization_id)
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.students s
      where s.id = goals.student_id and s.organization_id = goals.organization_id
    )
  );

alter policy "org members read ledger" on public.points_ledger
  using (exists (select 1 from public.memberships m where m.organization_id = points_ledger.organization_id and m.user_id = (select auth.uid()) and m.is_active));

alter policy "org adults create ledger" on public.points_ledger
  with check (exists (select 1 from public.memberships m where m.organization_id = points_ledger.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));

-- tasks
drop policy if exists "org adults manage tasks" on public.tasks;
create policy "org adults insert tasks" on public.tasks for insert
  with check (exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
create policy "org adults update tasks" on public.tasks for update
  using (exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active))
  with check (exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
create policy "org adults delete tasks" on public.tasks for delete
  using (exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
alter policy "org members read tasks" on public.tasks
  using (exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = (select auth.uid()) and m.is_active));

-- quran plans
drop policy if exists "org adults manage quran plans" on public.quran_plans;
create policy "org adults insert quran plans" on public.quran_plans for insert
  with check (exists (select 1 from public.memberships m where m.organization_id = quran_plans.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
create policy "org adults update quran plans" on public.quran_plans for update
  using (exists (select 1 from public.memberships m where m.organization_id = quran_plans.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active))
  with check (exists (select 1 from public.memberships m where m.organization_id = quran_plans.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
create policy "org adults delete quran plans" on public.quran_plans for delete
  using (exists (select 1 from public.memberships m where m.organization_id = quran_plans.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
alter policy "org members read quran plans" on public.quran_plans
  using (exists (select 1 from public.memberships m where m.organization_id = quran_plans.organization_id and m.user_id = (select auth.uid()) and m.is_active));

-- quran segments
drop policy if exists "plan adults manage quran segments" on public.quran_segments;
create policy "plan adults insert quran segments" on public.quran_segments for insert
  with check (exists (select 1 from public.quran_plans p join public.memberships m on m.organization_id = p.organization_id where p.id = quran_segments.plan_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
create policy "plan adults update quran segments" on public.quran_segments for update
  using (exists (select 1 from public.quran_plans p join public.memberships m on m.organization_id = p.organization_id where p.id = quran_segments.plan_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active))
  with check (exists (select 1 from public.quran_plans p join public.memberships m on m.organization_id = p.organization_id where p.id = quran_segments.plan_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
create policy "plan adults delete quran segments" on public.quran_segments for delete
  using (exists (select 1 from public.quran_plans p join public.memberships m on m.organization_id = p.organization_id where p.id = quran_segments.plan_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'teacher'::user_role, 'supervisor'::user_role]) and m.is_active));
alter policy "plan org members read quran segments" on public.quran_segments
  using (exists (select 1 from public.quran_plans p join public.memberships m on m.organization_id = p.organization_id where p.id = quran_segments.plan_id and m.user_id = (select auth.uid()) and m.is_active));

-- rewards
drop policy if exists "guardians manage rewards" on public.rewards;
create policy "guardians insert rewards" on public.rewards for insert
  with check (exists (select 1 from public.memberships m where m.organization_id = rewards.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role]) and m.is_active));
create policy "guardians update rewards" on public.rewards for update
  using (exists (select 1 from public.memberships m where m.organization_id = rewards.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role]) and m.is_active))
  with check (exists (select 1 from public.memberships m where m.organization_id = rewards.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role]) and m.is_active));
create policy "guardians delete rewards" on public.rewards for delete
  using (exists (select 1 from public.memberships m where m.organization_id = rewards.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role]) and m.is_active));
alter policy "org members read rewards" on public.rewards
  using (exists (select 1 from public.memberships m where m.organization_id = rewards.organization_id and m.user_id = (select auth.uid()) and m.is_active));

alter policy "guardians manage deferrals" on public.reward_deferrals
  using (exists (select 1 from public.rewards r join public.memberships m on m.organization_id = r.organization_id where r.id = reward_deferrals.reward_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role]) and m.is_active))
  with check (exists (select 1 from public.rewards r join public.memberships m on m.organization_id = r.organization_id where r.id = reward_deferrals.reward_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role]) and m.is_active));

alter policy "owners read subscriptions" on public.subscriptions
  using (exists (select 1 from public.memberships m where m.organization_id = subscriptions.organization_id and m.user_id = (select auth.uid()) and m.role = any (array['owner'::user_role, 'guardian'::user_role, 'supervisor'::user_role]) and m.is_active));
