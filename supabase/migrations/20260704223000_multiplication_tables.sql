create table if not exists public.multiplication_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  assigned_by uuid,
  assigned_role text not null check (assigned_role in ('parent', 'teacher')),
  from_table smallint not null default 1 check (from_table between 1 and 12),
  to_table smallint not null default 10 check (to_table between 1 and 12),
  questions_per_stage smallint not null default 10 check (questions_per_stage between 5 and 10),
  pass_percentage smallint not null default 80 check (pass_percentage between 50 and 100),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  current_table smallint not null default 1 check (current_table between 1 and 12),
  completed_tables integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint multiplication_program_table_range check (from_table <= to_table)
);

create table if not exists public.multiplication_stage_progress (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.multiplication_programs(id) on delete cascade,
  table_number smallint not null check (table_number between 1 and 12),
  status text not null default 'locked' check (status in ('locked', 'available', 'completed')),
  attempts_count integer not null default 0,
  best_score integer not null default 0 check (best_score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, table_number)
);

create table if not exists public.multiplication_rounds (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.multiplication_programs(id) on delete cascade,
  stage_id uuid not null references public.multiplication_stage_progress(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attempt_number integer not null default 1,
  question_limit smallint not null check (question_limit between 5 and 10),
  answered_count integer not null default 0,
  correct_count integer not null default 0,
  score integer,
  status text not null default 'active' check (status in ('active', 'passed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.multiplication_question_attempts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.multiplication_rounds(id) on delete cascade,
  program_id uuid not null references public.multiplication_programs(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  table_number smallint not null check (table_number between 1 and 12),
  multiplier smallint not null check (multiplier between 1 and 10),
  correct_answer integer not null,
  answer_options jsonb not null,
  chosen_answer integer,
  is_correct boolean,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists multiplication_programs_student_idx
  on public.multiplication_programs(student_id, created_at desc);
create index if not exists multiplication_stages_program_idx
  on public.multiplication_stage_progress(program_id, table_number);
create index if not exists multiplication_rounds_program_idx
  on public.multiplication_rounds(program_id, started_at desc);
create unique index if not exists multiplication_one_active_round_idx
  on public.multiplication_rounds(stage_id) where status = 'active';
create index if not exists multiplication_attempts_round_idx
  on public.multiplication_question_attempts(round_id, created_at);

alter table public.multiplication_programs enable row level security;
alter table public.multiplication_stage_progress enable row level security;
alter table public.multiplication_rounds enable row level security;
alter table public.multiplication_question_attempts enable row level security;
