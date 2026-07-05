revoke execute on function public.get_educational_program_catalog() from public;
revoke execute on function public.get_educational_program_catalog() from anon;
grant execute on function public.get_educational_program_catalog() to authenticated;
