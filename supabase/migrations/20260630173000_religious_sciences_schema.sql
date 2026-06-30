create table if not exists public.religious_science_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_title text not null,
  author text,
  science_category text not null,
  content_type text not null default 'poem',
  description text,
  age_min integer,
  age_max integer,
  source_name text,
  source_url text,
  source_note text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.religious_science_chapters (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.religious_science_catalog(id) on delete cascade,
  chapter_number integer not null,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(catalog_id, chapter_number)
);

create table if not exists public.religious_science_units (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.religious_science_catalog(id) on delete cascade,
  chapter_id uuid references public.religious_science_chapters(id) on delete set null,
  unit_number integer not null,
  first_part text not null,
  second_part text,
  full_text text not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(catalog_id, unit_number)
);

alter table public.religious_science_catalog enable row level security;
alter table public.religious_science_chapters enable row level security;
alter table public.religious_science_units enable row level security;

drop policy if exists religious_science_catalog_read on public.religious_science_catalog;
create policy religious_science_catalog_read on public.religious_science_catalog
for select to authenticated using (is_active = true);

drop policy if exists religious_science_chapters_read on public.religious_science_chapters;
create policy religious_science_chapters_read on public.religious_science_chapters
for select to authenticated using (
  exists (select 1 from public.religious_science_catalog c where c.id = catalog_id and c.is_active = true)
);

drop policy if exists religious_science_units_read on public.religious_science_units;
create policy religious_science_units_read on public.religious_science_units
for select to authenticated using (
  exists (select 1 from public.religious_science_catalog c where c.id = catalog_id and c.is_active = true)
);

grant select on public.religious_science_catalog, public.religious_science_chapters, public.religious_science_units to authenticated;

alter table public.quran_plans add column if not exists content_kind text not null default 'quran';
alter table public.quran_plans add column if not exists subject_category text;
alter table public.quran_plans add column if not exists catalog_item_id uuid references public.religious_science_catalog(id) on delete set null;
alter table public.quran_plans add column if not exists goal_id uuid references public.goals(id) on delete set null;
alter table public.quran_plans drop constraint if exists quran_plans_content_kind_check;
alter table public.quran_plans add constraint quran_plans_content_kind_check check (content_kind in ('quran','matn'));

alter table public.quran_segments alter column surah_number drop not null;
alter table public.quran_segments drop constraint if exists quran_segments_surah_number_check;
alter table public.quran_segments add constraint quran_segments_surah_number_check check (surah_number is null or surah_number between 1 and 114);
alter table public.quran_segments add column if not exists catalog_unit_from integer;
alter table public.quran_segments add column if not exists catalog_unit_to integer;
alter table public.quran_segments add column if not exists chapter_title text;
