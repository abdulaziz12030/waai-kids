create or replace function public.get_my_portal_access()
returns jsonb
language sql
security definer
set search_path = public
as $function$
  select jsonb_build_object(
    'family', exists (
      select 1
      from public.organizations o
      where o.owner_id = auth.uid()
        and o.type = 'family'
    ),
    'teacher', (
      exists (
        select 1
        from public.teacher_student_links l
        where l.teacher_user_id = auth.uid()
          and l.status = 'active'
      )
      or exists (
        select 1
        from public.organizations o
        where o.owner_id = auth.uid()
          and o.type in ('independent_teacher','halaqa','school')
      )
      or exists (
        select 1
        from public.memberships m
        where m.user_id = auth.uid()
          and m.role = 'teacher'
          and m.is_active = true
      )
    )
  )
$function$;

revoke all on function public.get_my_portal_access() from public;
grant execute on function public.get_my_portal_access() to authenticated;
