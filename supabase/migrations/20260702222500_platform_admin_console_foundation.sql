create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'super_admin' check (role in ('super_admin','operations_admin','support_admin','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
alter table public.admin_audit_logs enable row level security;

create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.platform_admins a
    where a.user_id = auth.uid() and a.is_active = true
      and (p_user_id is null or p_user_id = auth.uid())
  );
$$;

drop policy if exists "platform admins can view own access" on public.platform_admins;
create policy "platform admins can view own access" on public.platform_admins
for select to authenticated using (user_id = auth.uid());

drop policy if exists "platform admins can view audit logs" on public.admin_audit_logs;
create policy "platform admins can view audit logs" on public.admin_audit_logs
for select to authenticated using (public.is_platform_admin(auth.uid()));

revoke execute on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated;

-- Add the first administrator with a private environment-specific data operation.
