create or replace function public.reset_student_point_balance(
  p_student_id uuid,
  p_point_type text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_student public.students%rowtype;
  v_type text := lower(trim(coalesce(p_point_type, '')));
  v_is_admin boolean := public.is_platform_admin(auth.uid());
  v_is_owner boolean := false;
  v_previous_achievement integer := 0;
  v_previous_reward integer := 0;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_actor_label text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_type not in ('achievement', 'reward', 'all') then
    raise exception 'INVALID_POINT_TYPE';
  end if;

  select s.* into v_student
  from public.students s
  where s.id = p_student_id
  for update;

  if v_student.id is null then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  v_is_owner := public.is_organization_owner(v_student.organization_id);
  if not (v_is_admin or v_is_owner) then
    raise exception 'POINT_RESET_ACCESS_DENIED';
  end if;

  v_previous_achievement := greatest(coalesce(v_student.achievement_points, 0), 0);
  v_previous_reward := greatest(coalesce(v_student.reward_points, 0), 0);
  v_actor_label := case when v_is_admin then 'الآدمين' else 'ولي الأمر' end;

  if v_type in ('achievement', 'all') and v_previous_achievement > 0 then
    insert into public.points_ledger(
      organization_id,
      student_id,
      source_type,
      source_id,
      points,
      note,
      created_by,
      point_type
    ) values (
      v_student.organization_id,
      v_student.id,
      'balance_reset',
      null,
      -v_previous_achievement,
      concat('تصفير رصيد الإنجاز بواسطة ', v_actor_label,
        case when v_reason is not null then ' · ' || v_reason else '' end),
      auth.uid(),
      'achievement'
    );
  end if;

  if v_type in ('reward', 'all') and v_previous_reward > 0 then
    insert into public.points_ledger(
      organization_id,
      student_id,
      source_type,
      source_id,
      points,
      note,
      created_by,
      point_type
    ) values (
      v_student.organization_id,
      v_student.id,
      'balance_reset',
      null,
      -v_previous_reward,
      concat('تصفير رصيد المكافآت بواسطة ', v_actor_label,
        case when v_reason is not null then ' · ' || v_reason else '' end),
      auth.uid(),
      'reward'
    );
  end if;

  update public.students
  set achievement_points = case
        when v_type in ('achievement', 'all') then 0
        else v_previous_achievement
      end,
      points_balance = case
        when v_type in ('achievement', 'all') then 0
        else v_previous_achievement
      end,
      reward_points = case
        when v_type in ('reward', 'all') then 0
        else v_previous_reward
      end,
      updated_at = now()
  where id = v_student.id;

  if v_is_admin then
    insert into public.admin_audit_logs(
      admin_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      auth.uid(),
      'reset_student_point_balance',
      'student',
      v_student.id,
      jsonb_build_object(
        'point_type', v_type,
        'previous_achievement_points', v_previous_achievement,
        'previous_reward_points', v_previous_reward,
        'reason', v_reason
      )
    );
  end if;

  return jsonb_build_object(
    'point_type', v_type,
    'previous_achievement_points', v_previous_achievement,
    'previous_reward_points', v_previous_reward,
    'achievement_points', case when v_type in ('achievement', 'all') then 0 else v_previous_achievement end,
    'reward_points', case when v_type in ('reward', 'all') then 0 else v_previous_reward end,
    'history_preserved', true
  );
end;
$function$;

revoke all on function public.reset_student_point_balance(uuid,text,text) from public, anon;
grant execute on function public.reset_student_point_balance(uuid,text,text) to authenticated;
