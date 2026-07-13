create or replace function public.ensure_student_child_login_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.child_login_code is null or btrim(new.child_login_code) = '' then
    new.child_login_code := public.generate_child_login_code(new.organization_id);
  else
    new.child_login_code := btrim(new.child_login_code);
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_student_child_login_code_before_write on public.students;

create trigger ensure_student_child_login_code_before_write
before insert or update of organization_id, child_login_code
on public.students
for each row
execute function public.ensure_student_child_login_code();
