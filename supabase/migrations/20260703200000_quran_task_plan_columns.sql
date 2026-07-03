alter table public.tasks
  add column if not exists quran_mode text,
  add column if not exists surah_number integer,
  add column if not exists from_ayah integer,
  add column if not exists to_ayah integer,
  add column if not exists quran_text text,
  add column if not exists quran_plan_title text,
  add column if not exists generated_from_quran_task boolean not null default false;

alter table public.tasks drop constraint if exists tasks_quran_mode_check;
alter table public.tasks add constraint tasks_quran_mode_check
  check (quran_mode is null or quran_mode in ('recitation','memorization'));

alter table public.tasks drop constraint if exists tasks_quran_range_check;
alter table public.tasks add constraint tasks_quran_range_check check (
  (surah_number is null and from_ayah is null and to_ayah is null)
  or (surah_number between 1 and 114 and from_ayah >= 1 and to_ayah >= from_ayah)
);

create index if not exists tasks_quran_plan_batch_idx
  on public.tasks(student_id, plan_batch_id, plan_step)
  where generated_from_quran_task;

create index if not exists tasks_quran_surah_idx
  on public.tasks(surah_number, from_ayah, to_ayah)
  where surah_number is not null;
