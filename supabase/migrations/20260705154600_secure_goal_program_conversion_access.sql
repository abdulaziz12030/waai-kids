revoke execute on function public.convert_goal_to_multiplication_program(uuid,integer,integer,integer,integer,integer,integer,date,date,text) from public;
revoke execute on function public.convert_goal_to_multiplication_program(uuid,integer,integer,integer,integer,integer,integer,date,date,text) from anon;
grant execute on function public.convert_goal_to_multiplication_program(uuid,integer,integer,integer,integer,integer,integer,date,date,text) to authenticated;

revoke execute on function public.convert_goal_to_religious_science_program(uuid,text,date,integer,integer,integer,text) from public;
revoke execute on function public.convert_goal_to_religious_science_program(uuid,text,date,integer,integer,integer,text) from anon;
grant execute on function public.convert_goal_to_religious_science_program(uuid,text,date,integer,integer,integer,text) to authenticated;
