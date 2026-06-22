alter table public.students
add column if not exists profile_data jsonb not null default '{}'::jsonb;

comment on column public.students.profile_data is
'Flexible child profile fields such as birth date, gender, grade level, and avatar.';
