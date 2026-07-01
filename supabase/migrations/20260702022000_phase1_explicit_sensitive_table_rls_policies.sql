-- Explicit policies for sensitive tables that are intentionally not directly accessed by clients.
-- SECURITY DEFINER RPCs continue to handle approved access paths.

create policy "no direct child access reads" on public.child_access
  for select using (false);
create policy "no direct child access writes" on public.child_access
  for all using (false) with check (false);

create policy "no direct child sessions reads" on public.child_sessions
  for select using (false);
create policy "no direct child sessions writes" on public.child_sessions
  for all using (false) with check (false);

create policy "no direct child login attempts reads" on public.child_login_attempts
  for select using (false);
create policy "no direct child login attempts writes" on public.child_login_attempts
  for all using (false) with check (false);
