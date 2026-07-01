create or replace function public.send_child_gift(
  p_student_id uuid,
  p_gift_code text,
  p_achievement_title text,
  p_reason text default null::text,
  p_goal_id uuid default null::uuid,
  p_task_id uuid default null::uuid,
  p_achievement_type text default 'custom'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_student public.students%rowtype;
  v_catalog public.gift_catalog%rowtype;
  v_goal public.goals%rowtype;
  v_task public.tasks%rowtype;
  v_gift public.child_gifts%rowtype;
  v_sender text;
  v_certificate text;
begin
  select * into v_student from public.students where id = p_student_id for update;
  if v_student.id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.is_organization_owner(v_student.organization_id) then raise exception 'غير مصرح لك بإرسال الهدية'; end if;

  select * into v_catalog from public.gift_catalog where code = p_gift_code and is_active;
  if v_catalog.id is null then raise exception 'الهدية غير متاحة'; end if;
  if coalesce(length(trim(p_achievement_title)), 0) < 3 then raise exception 'اكتب سببًا واضحًا للتكريم'; end if;

  if p_goal_id is not null then
    select * into v_goal from public.goals where id = p_goal_id and student_id = p_student_id;
    if v_goal.id is null then raise exception 'الهدف غير مرتبط بهذا الطفل'; end if;
    if v_goal.status::text <> 'completed' then raise exception 'لا يمكن تكريم الهدف الكامل قبل اكتماله'; end if;
  end if;

  if p_task_id is not null then
    select * into v_task from public.tasks where id = p_task_id and student_id = p_student_id;
    if v_task.id is null then raise exception 'المهمة غير مرتبطة بهذا الطفل'; end if;
    if v_task.status::text <> 'approved' then raise exception 'لا يمكن تكريم جزء من الهدف قبل اعتماده'; end if;
  end if;

  select coalesce(nullif(trim(o.guardian_display_name), ''), 'ولي الأمر') into v_sender
  from public.organizations o where o.id = v_student.organization_id;

  v_certificate := 'NMA-' || to_char(now(), 'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.child_gifts(
    organization_id,
    student_id,
    gift_catalog_id,
    goal_id,
    task_id,
    achievement_type,
    achievement_title,
    reason,
    sender_name,
    is_included,
    coin_cost,
    certificate_number,
    created_by
  ) values (
    v_student.organization_id,
    v_student.id,
    v_catalog.id,
    p_goal_id,
    p_task_id,
    case when p_achievement_type in ('goal', 'task', 'quran', 'custom') then p_achievement_type else 'custom' end,
    trim(p_achievement_title),
    nullif(trim(p_reason), ''),
    v_sender,
    true,
    0,
    v_certificate,
    auth.uid()
  ) returning * into v_gift;

  return jsonb_build_object(
    'id', v_gift.id,
    'certificate_number', v_gift.certificate_number,
    'gift_name', v_catalog.name,
    'gift_icon', v_catalog.icon,
    'student_name', v_student.full_name,
    'coin_cost', 0,
    'is_included', true,
    'trial_mode', true,
    'gifted_at', v_gift.gifted_at
  );
end;
$function$;
