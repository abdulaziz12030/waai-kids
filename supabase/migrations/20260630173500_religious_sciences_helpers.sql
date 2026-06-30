create or replace function public.get_religious_science_catalog()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'title', c.title,
    'short_title', c.short_title,
    'author', c.author,
    'science_category', c.science_category,
    'content_type', c.content_type,
    'description', c.description,
    'age_min', c.age_min,
    'age_max', c.age_max,
    'source_name', c.source_name,
    'source_note', c.source_note,
    'units_count', (select count(*) from public.religious_science_units u where u.catalog_id = c.id),
    'chapters_count', (select count(*) from public.religious_science_chapters ch where ch.catalog_id = c.id),
    'metadata', c.metadata
  ) order by c.sort_order, c.title), '[]'::jsonb)
  from public.religious_science_catalog c
  where c.is_active = true
$$;

grant execute on function public.get_religious_science_catalog() to authenticated;

create or replace function public.refresh_memorization_goal_progress(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_id uuid;
  v_total integer;
  v_mastered integer;
  v_progress integer;
begin
  select qp.goal_id into v_goal_id from public.quran_plans qp where qp.id = p_plan_id;
  if v_goal_id is null then return; end if;

  select count(*), count(*) filter (where status = 'mastered')
  into v_total, v_mastered
  from public.quran_segments
  where plan_id = p_plan_id;

  v_progress := case when v_total = 0 then 0 else round((v_mastered::numeric / v_total::numeric) * 100)::integer end;

  update public.goals
  set progress = v_progress,
      status = case when v_progress >= 100 then 'completed'::public.goal_status else 'active'::public.goal_status end,
      updated_at = now()
  where id = v_goal_id;
end;
$$;

create or replace function public.sync_memorization_goal_after_segment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_memorization_goal_progress(old.plan_id);
    return old;
  end if;
  perform public.refresh_memorization_goal_progress(new.plan_id);
  return new;
end;
$$;

drop trigger if exists trg_sync_memorization_goal_after_segment on public.quran_segments;
create trigger trg_sync_memorization_goal_after_segment
after insert or delete or update of status on public.quran_segments
for each row execute function public.sync_memorization_goal_after_segment();

create or replace function public.ensure_memorization_plan_goal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_id uuid;
  v_description text;
begin
  if new.goal_id is not null then return new; end if;
  v_description := case when new.content_kind = 'matn' then 'برنامج متدرج ضمن قسم العلوم الدينية' else 'برنامج متدرج لحفظ القرآن الكريم' end;

  insert into public.goals(
    organization_id, student_id, title, description, category,
    target_points, due_date, status, created_by, goal_type,
    start_date, progress
  ) values (
    new.organization_id, new.student_id, new.title, v_description,
    case when new.content_kind = 'matn' then 'religious_sciences' else 'quran' end,
    0, new.due_date, 'active', new.assigned_by,
    'educational', new.start_date, 0
  ) returning id into v_goal_id;

  update public.quran_plans set goal_id = v_goal_id where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_ensure_memorization_plan_goal on public.quran_plans;
create trigger trg_ensure_memorization_plan_goal
after insert on public.quran_plans
for each row execute function public.ensure_memorization_plan_goal();
