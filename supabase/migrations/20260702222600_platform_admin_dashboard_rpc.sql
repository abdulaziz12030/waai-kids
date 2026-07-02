create or replace function public.get_admin_dashboard(p_search text default '', p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return jsonb_build_object(
    'admin', (select jsonb_build_object('role', a.role, 'user_id', a.user_id) from public.platform_admins a where a.user_id = auth.uid()),
    'metrics', jsonb_build_object(
      'organizations', (select count(*) from public.organizations),
      'families', (select count(*) from public.organizations where type::text = 'family'),
      'teachers', (select count(*) from public.organizations where type::text = 'teacher'),
      'students', (select count(*) from public.students),
      'active_goals', (select count(*) from public.goals where status::text in ('approved','active','paused')),
      'pending_tasks', (select count(*) from public.tasks where status::text = 'submitted'),
      'delivered_gifts', (select count(*) from public.child_gifts where status = 'delivered'),
      'subscriptions', (select count(*) from public.subscriptions),
      'active_subscriptions', (select count(*) from public.subscriptions where status = 'active')
    ),
    'organizations', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select o.id, o.name, o.type::text as type, o.family_title, o.city, o.family_code, o.created_at,
             u.email as owner_email,
             (select count(*) from public.students s where s.organization_id = o.id) as students_count,
             (select count(*) from public.memberships m where m.organization_id = o.id and m.is_active) as active_members_count,
             (select jsonb_build_object('id', sub.id, 'status', sub.status, 'plan_code', sub.plan_code, 'ends_at', sub.ends_at)
              from public.subscriptions sub where sub.organization_id = o.id order by sub.created_at desc limit 1) as subscription
      from public.organizations o left join auth.users u on u.id = o.owner_id
      where v_search is null or coalesce(o.name,'') ilike '%'||v_search||'%'
         or coalesce(o.family_title,'') ilike '%'||v_search||'%'
         or coalesce(o.family_code,'') ilike '%'||v_search||'%'
         or coalesce(u.email,'') ilike '%'||v_search||'%'
      order by o.created_at desc limit v_limit
    ) x), '[]'::jsonb),
    'students', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select s.id, s.full_name, s.organization_id, o.name as organization_name,
             s.achievement_points, s.reward_points, s.child_login_code, s.created_at,
             (select count(*) from public.goals g where g.student_id=s.id) as goals_count,
             (select count(*) from public.tasks t where t.student_id=s.id) as tasks_count,
             (select count(*) from public.child_gifts cg where cg.student_id=s.id) as gifts_count
      from public.students s join public.organizations o on o.id=s.organization_id
      where v_search is null or s.full_name ilike '%'||v_search||'%'
         or o.name ilike '%'||v_search||'%'
         or s.child_login_code ilike '%'||v_search||'%'
      order by s.created_at desc limit v_limit
    ) x), '[]'::jsonb),
    'subscriptions', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select sub.id, sub.organization_id, o.name as organization_name, sub.plan_code, sub.status,
             sub.starts_at, sub.ends_at, sub.created_at
      from public.subscriptions sub join public.organizations o on o.id=sub.organization_id
      order by sub.created_at desc limit v_limit
    ) x), '[]'::jsonb),
    'memberships', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select m.id, m.organization_id, o.name as organization_name, m.user_id, u.email,
             m.role::text as role, m.display_name, m.is_active, m.created_at
      from public.memberships m join public.organizations o on o.id=m.organization_id
      left join auth.users u on u.id=m.user_id
      order by m.created_at desc limit v_limit
    ) x), '[]'::jsonb),
    'recent_gifts', coalesce((select jsonb_agg(to_jsonb(x) order by x.gifted_at desc) from (
      select cg.id, cg.student_id, s.full_name as student_name, o.name as organization_name,
             gc.name_ar as gift_name, cg.achievement_title, cg.sender_name, cg.status, cg.coin_cost,
             cg.gifted_at, cg.opened_at
      from public.child_gifts cg join public.students s on s.id=cg.student_id
      join public.organizations o on o.id=cg.organization_id
      join public.gift_catalog gc on gc.id=cg.gift_catalog_id
      order by cg.gifted_at desc limit v_limit
    ) x), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_admin_dashboard(text, integer) from public, anon;
grant execute on function public.get_admin_dashboard(text, integer) to authenticated;
