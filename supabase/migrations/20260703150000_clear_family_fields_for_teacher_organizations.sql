create or replace function public.normalize_organization_role_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.type::text in ('independent_teacher','halaqa','school') then
    new.family_title := null;
    new.guardian_display_name := null;
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_organization_role_fields_trigger on public.organizations;
create trigger normalize_organization_role_fields_trigger
before insert or update of type, family_title, guardian_display_name
on public.organizations
for each row execute function public.normalize_organization_role_fields();
