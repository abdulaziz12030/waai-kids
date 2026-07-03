create or replace function public.child_submit_task(
  p_session_token uuid,
  p_task_id uuid,
  p_child_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_task public.tasks%rowtype;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.expires_at > now()
    and cs.revoked_at is null;

  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;

  select t.* into v_task
  from public.tasks t
  where t.id = p_task_id and t.student_id = v_student_id;

  if v_task.id is null then raise exception 'المهمة غير موجودة'; end if;
  if v_task.status not in ('pending', 'rejected') then raise exception 'لا يمكن إرسال هذه المهمة'; end if;
  if v_task.starts_on is not null and v_task.starts_on > current_date then raise exception 'لم يحن وقت هذه المهمة بعد'; end if;

  if v_task.plan_batch_id is not null
     and coalesce(v_task.plan_step, 1) > 1
     and exists (
       select 1 from public.tasks previous_task
       where previous_task.plan_batch_id = v_task.plan_batch_id
         and previous_task.plan_step < v_task.plan_step
         and previous_task.status <> 'approved'
     ) then
    raise exception 'أكمل المرحلة السابقة واعتمدها ولي الأمر أولًا';
  end if;

  update public.tasks
  set status = 'submitted',
      child_note = nullif(trim(p_child_note), ''),
      submitted_at = now(),
      updated_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.get_child_dashboard(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.expires_at > now()
    and cs.revoked_at is null;

  if v_student_id is null then raise exception 'انتهت جلسة الطفل'; end if;
  update public.child_sessions set last_seen_at = now() where session_token = p_session_token;

  select jsonb_build_object(
    'student', jsonb_build_object(
      'id', s.id, 'full_name', s.full_name,
      'achievement_points', s.achievement_points,
      'reward_points', s.reward_points,
      'level', public.get_student_level(s.achievement_points),
      'profile_data', s.profile_data
    ),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'title', g.title, 'description', g.description,
        'goal_type', g.goal_type, 'status', g.status, 'progress', g.progress,
        'required_points', g.required_points, 'target_value', g.target_value,
        'start_date', g.start_date, 'due_date', g.due_date,
        'decision_note', g.decision_note, 'decided_at', g.decided_at,
        'task_plan_mode', g.task_plan_mode, 'task_plan_count', g.task_plan_count,
        'reward_status', r.status, 'reward_paid_amount', r.paid_amount,
        'reward_granted_at', r.granted_at, 'reward_grant_note', r.grant_note
      ) order by g.created_at desc)
      from public.goals g
      left join public.rewards r on r.goal_id = g.id
      where g.student_id = s.id
        and g.status::text in ('pending','requested','approved','active','paused','completed','rejected')
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'goal_id', t.goal_id,
        'title', t.title,
        'description', t.description,
        'category', case when t.category = 'quran' then 'quran_task' else t.category end,
        'source_category', t.category,
        'difficulty', t.difficulty,
        'achievement_points', t.achievement_points,
        'reward_points', t.reward_points,
        'status', t.status,
        'starts_on', t.starts_on,
        'due_date', t.due_date,
        'plan_batch_id', t.plan_batch_id,
        'plan_step', t.plan_step,
        'plan_total', t.plan_total,
        'generated_from_goal', t.generated_from_goal,
        'generated_from_quran_task', t.generated_from_quran_task,
        'quran_mode', t.quran_mode,
        'surah_number', t.surah_number,
        'from_ayah', t.from_ayah,
        'to_ayah', t.to_ayah,
        'quran_text', t.quran_text,
        'quran_plan_title', t.quran_plan_title,
        'child_note', t.child_note,
        'review_note', t.review_note,
        'submitted_at', t.submitted_at,
        'approved_at', t.approved_at,
        'has_gift', exists(select 1 from public.child_gifts cg where cg.task_id = t.id)
      ) order by
        case when t.status::text in ('pending','rejected') then 0 when t.status::text = 'submitted' then 1 else 2 end,
        t.starts_on asc nulls first,
        t.plan_step asc nulls first,
        t.created_at desc)
      from public.tasks t
      where t.student_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.students s
  where s.id = v_student_id;

  return v_result;
end;
$$;

create or replace function public.notify_child_task_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_type text;
  v_title text;
  v_body text;
  v_icon text;
  v_key text;
  v_actor_user uuid;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.generated_from_quran_task, false) and coalesce(new.plan_step, 1) > 1 then
      return new;
    end if;

    v_actor := public.child_notification_actor_label(new.assigned_by, new.organization_id);
    insert into public.child_notifications(
      organization_id, student_id, notification_type, title, body, icon,
      action_type, action_id, source_key, metadata, created_at
    ) values (
      new.organization_id,
      new.student_id,
      'task',
      case when coalesce(new.generated_from_quran_task, false) then 'لديك مهمة قرآنية جديدة' else 'لديك مهمة جديدة' end,
      case
        when coalesce(new.generated_from_quran_task, false) then
          coalesce(new.quran_plan_title, new.title) || ' · ' || coalesce(new.plan_total, 1) || ' أجزاء'
        else new.title || coalesce(' · ' || nullif(trim(new.description), ''), '')
      end,
      case when coalesce(new.generated_from_quran_task, false) then '📖' else '✅' end,
      'task',
      new.id,
      'task:' || new.id::text || ':assigned',
      jsonb_build_object(
        'actor', v_actor,
        'starts_on', new.starts_on,
        'due_date', new.due_date,
        'plan_batch_id', new.plan_batch_id,
        'plan_total', new.plan_total,
        'quran_mode', new.quran_mode
      ),
      new.created_at
    ) on conflict (source_key) do nothing;
    return new;
  end if;

  v_actor_user := coalesce(new.approved_by, auth.uid(), new.assigned_by);
  v_actor := public.child_notification_actor_label(v_actor_user, new.organization_id);

  if new.status::text = 'approved' and old.status::text is distinct from new.status::text then
    v_type := 'recognition';
    v_title := 'أحسنت! تم اعتماد مهمتك 🌟';
    v_body := new.title || case when nullif(trim(new.review_note), '') is not null then ' · ' || trim(new.review_note) else '' end;
    v_icon := '🌟';
    v_key := 'task:' || new.id::text || ':approved:' || coalesce(new.updated_at::text, now()::text);
  elsif nullif(trim(new.review_note), '') is not null and old.review_note is distinct from new.review_note then
    v_type := case when exists (
      select 1 from public.memberships m
      where m.user_id = v_actor_user and m.organization_id = new.organization_id and m.role::text = 'teacher' and m.is_active
    ) then 'teacher_reply' else 'guardian_reply' end;
    v_title := case when v_type = 'teacher_reply' then 'رد جديد من المعلم' else 'رد جديد من ولي الأمر' end;
    v_body := trim(new.review_note);
    v_icon := case when v_type = 'teacher_reply' then '👨‍🏫' else '💬' end;
    v_key := 'task:' || new.id::text || ':reply:' || md5(coalesce(new.review_note, '') || coalesce(new.updated_at::text, now()::text));
  elsif new.status::text = 'rejected' and old.status::text is distinct from new.status::text then
    v_type := 'guardian_reply';
    v_title := 'لديك ملاحظة على المهمة';
    v_body := coalesce(nullif(trim(new.review_note), ''), 'راجع المهمة وحاول مرة أخرى.');
    v_icon := '📝';
    v_key := 'task:' || new.id::text || ':rejected:' || coalesce(new.updated_at::text, now()::text);
  else
    return new;
  end if;

  insert into public.child_notifications(
    organization_id, student_id, notification_type, title, body, icon,
    action_type, action_id, source_key, metadata, created_at
  ) values (
    new.organization_id,
    new.student_id,
    v_type,
    v_title,
    v_body,
    v_icon,
    'task',
    new.id,
    v_key,
    jsonb_build_object('actor', v_actor, 'status', new.status::text),
    coalesce(new.updated_at, now())
  ) on conflict (source_key) do nothing;

  return new;
end;
$$;

create or replace function public.get_parent_task_recognition_status(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_result jsonb;
begin
  select s.organization_id into v_org_id
  from public.students s
  where s.id = p_student_id;

  if v_org_id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.is_organization_owner(v_org_id) then raise exception 'غير مصرح لك بعرض تكريم المهام'; end if;

  select jsonb_build_object(
    'student_id', p_student_id,
    'tasks', coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'title', coalesce(nullif(t.quran_plan_title, ''), t.title),
      'description', t.description,
      'category', t.category,
      'quran_mode', t.quran_mode,
      'plan_batch_id', t.plan_batch_id,
      'plan_total', t.plan_total,
      'approved_at', t.approved_at,
      'achievement_points', case when t.plan_batch_id is null then t.achievement_points else (
        select coalesce(sum(x.achievement_points), 0) from public.tasks x where x.plan_batch_id = t.plan_batch_id
      ) end,
      'reward_points', case when t.plan_batch_id is null then t.reward_points else (
        select coalesce(sum(x.reward_points), 0) from public.tasks x where x.plan_batch_id = t.plan_batch_id
      ) end,
      'gift_count', coalesce(g.gift_count, 0),
      'last_gift_id', g.last_gift_id,
      'last_gift_title', g.last_gift_title,
      'last_gifted_at', g.last_gifted_at
    ) order by t.approved_at desc nulls last), '[]'::jsonb)
  ) into v_result
  from public.tasks t
  left join lateral (
    select
      count(*)::integer as gift_count,
      (array_agg(cg.id order by cg.gifted_at desc))[1] as last_gift_id,
      (array_agg(cg.achievement_title order by cg.gifted_at desc))[1] as last_gift_title,
      max(cg.gifted_at) as last_gifted_at
    from public.child_gifts cg
    where cg.task_id = t.id
  ) g on true
  where t.student_id = p_student_id
    and t.status::text = 'approved'
    and (
      t.plan_batch_id is null
      or (
        coalesce(t.plan_step, 1) = coalesce(t.plan_total, 1)
        and not exists (
          select 1 from public.tasks pending_task
          where pending_task.plan_batch_id = t.plan_batch_id
            and pending_task.status::text <> 'approved'
        )
      )
    );

  return coalesce(v_result, jsonb_build_object('student_id', p_student_id, 'tasks', '[]'::jsonb));
end;
$$;

revoke all on function public.get_parent_task_recognition_status(uuid) from public, anon;
grant execute on function public.get_parent_task_recognition_status(uuid) to authenticated;
