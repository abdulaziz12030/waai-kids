alter table public.goals
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists student_id uuid references public.students(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists goal_type text not null default 'educational',
  add column if not exists status text not null default 'pending',
  add column if not exists target_value numeric(12,2),
  add column if not exists child_contribution numeric(12,2) not null default 0,
  add column if not exists required_points integer not null default 0,
  add column if not exists start_date date,
  add column if not exists due_date date,
  add column if not exists progress integer not null default 0,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.goals enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'goals'
  loop
    execute format('drop policy if exists %I on public.goals', policy_record.policyname);
  end loop;
end $$;

create policy "goals_select_family"
on public.goals
for select
to authenticated
using (
  public.is_organization_owner(organization_id)
  or public.is_organization_member(organization_id)
);

create policy "goals_insert_family_owner"
on public.goals
for insert
to authenticated
with check (
  public.is_organization_owner(organization_id)
  and created_by = auth.uid()
  and exists (
    select 1 from public.students s
    where s.id = student_id and s.organization_id = organization_id
  )
);

create policy "goals_update_family_owner"
on public.goals
for update
to authenticated
using (public.is_organization_owner(organization_id))
with check (public.is_organization_owner(organization_id));

create policy "goals_delete_family_owner"
on public.goals
for delete
to authenticated
using (public.is_organization_owner(organization_id));

create index if not exists goals_student_id_idx on public.goals(student_id);
create index if not exists goals_organization_id_idx on public.goals(organization_id);
create index if not exists goals_status_idx on public.goals(status);
