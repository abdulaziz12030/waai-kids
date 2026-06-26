create or replace function public.get_teacher_code()
returns text
language sql
security definer
set search_path = public
as $function$
  select o.family_code
  from public.organizations o
  where o.owner_id = auth.uid()
    and o.family_code is not null
    and (
      o.type in ('independent_teacher','halaqa','school')
      or exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid()
          and m.role = 'teacher'
          and m.is_active = true
      )
      or exists (
        select 1 from public.teacher_student_links l
        where l.teacher_user_id = auth.uid()
          and l.status = 'active'
      )
    )
  order by case when o.type in ('independent_teacher','halaqa','school') then 0 else 1 end,
           o.created_at
  limit 1
$function$;

create or replace function public.link_teacher_to_student(p_student_id uuid, p_teacher_code text)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_org uuid;
  v_teacher_id uuid;
  v_teacher_name text;
begin
  select s.organization_id into v_student_org
  from public.students s
  where s.id = p_student_id;

  if v_student_org is null or not public.is_organization_owner(v_student_org) then
    raise exception 'غير مصرح لك';
  end if;

  select o.owner_id, coalesce(p.full_name, o.name)
  into v_teacher_id, v_teacher_name
  from public.organizations o
  left join public.profiles p on p.id = o.owner_id
  where upper(o.family_code) = upper(trim(p_teacher_code))
    and o.owner_id is not null
    and (
      o.type in ('independent_teacher','halaqa','school')
      or exists (
        select 1 from public.memberships m
        where m.user_id = o.owner_id
          and m.role = 'teacher'
          and m.is_active = true
      )
      or exists (
        select 1 from public.teacher_student_links l
        where l.teacher_user_id = o.owner_id
          and l.status = 'active'
      )
    )
  order by case when o.type in ('independent_teacher','halaqa','school') then 0 else 1 end
  limit 1;

  if v_teacher_id is null then
    raise exception 'رمز المعلم غير صحيح';
  end if;

  insert into public.teacher_student_links(teacher_user_id, student_id, status, created_by, updated_at)
  values(v_teacher_id, p_student_id, 'active', auth.uid(), now())
  on conflict (teacher_user_id, student_id)
  do update set status = 'active', updated_at = now(), created_by = auth.uid();

  return v_teacher_name;
end;
$function$;

revoke all on function public.get_teacher_code() from public;
revoke all on function public.link_teacher_to_student(uuid, text) from public;
grant execute on function public.get_teacher_code() to authenticated;
grant execute on function public.link_teacher_to_student(uuid, text) to authenticated;
