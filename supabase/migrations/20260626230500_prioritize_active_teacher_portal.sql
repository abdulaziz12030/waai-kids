create or replace function public.get_my_portal_type()
returns text
language sql
security definer
set search_path = public
as $function$
  select case
    when exists (
      select 1
      from public.teacher_student_links l
      where l.teacher_user_id = auth.uid()
        and l.status = 'active'
    ) or exists (
      select 1
      from public.organizations o
      where o.owner_id = auth.uid()
        and o.type in ('independent_teacher','halaqa','school')
    ) or exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'teacher'
        and m.is_active = true
    ) then 'teacher'
    when exists (
      select 1
      from public.organizations o
      where o.owner_id = auth.uid()
        and o.type = 'family'
    ) then 'family'
    else 'new'
  end
$function$;

revoke all on function public.get_my_portal_type() from public;
grant execute on function public.get_my_portal_type() to authenticated;
