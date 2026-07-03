create or replace function public.get_family_gift_center(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_wallet public.family_gift_wallets%rowtype;
  v_result jsonb;
begin
  select * into v_student from public.students where id = p_student_id;
  if v_student.id is null then raise exception 'الطفل غير موجود'; end if;
  if not public.is_organization_owner(v_student.organization_id) then raise exception 'غير مصرح لك بعرض الهدايا'; end if;

  v_wallet := public.refresh_family_gift_wallet(v_student.organization_id);

  select jsonb_build_object(
    'student', jsonb_build_object('id', v_student.id, 'full_name', v_student.full_name),
    'wallet', jsonb_build_object(
      'coin_balance', v_wallet.coin_balance,
      'included_monthly_limit', v_wallet.included_monthly_limit,
      'included_used', v_wallet.included_used,
      'included_remaining', greatest(v_wallet.included_monthly_limit - v_wallet.included_used, 0),
      'allowance_month', v_wallet.allowance_month
    ),
    'catalog', coalesce((
      select jsonb_agg(to_jsonb(gc) order by gc.sort_order, gc.name)
      from public.gift_catalog gc where gc.is_active
    ), '[]'::jsonb),
    'coin_packages', coalesce((
      select jsonb_agg(to_jsonb(cp) order by cp.sort_order, cp.price_sar)
      from public.coin_packages cp where cp.is_active
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'title', g.title,
        'status', g.status,
        'progress', g.progress,
        'completed_at', g.updated_at
      ) order by g.updated_at desc)
      from public.goals g
      where g.student_id = v_student.id and g.status::text = 'completed'
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'goal_id', t.goal_id,
        'title', coalesce(nullif(t.quran_plan_title, ''), t.title),
        'description', t.description,
        'approved_at', t.approved_at
      ) order by t.approved_at desc nulls last)
      from public.tasks t
      where t.student_id = v_student.id
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
        )
    ), '[]'::jsonb),
    'recent_gifts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cg.id,
        'achievement_title', cg.achievement_title,
        'reason', cg.reason,
        'status', cg.status,
        'gifted_at', cg.gifted_at,
        'opened_at', cg.opened_at,
        'certificate_number', cg.certificate_number,
        'gift', jsonb_build_object(
          'code', gc.code,
          'name', gc.name,
          'icon', gc.icon,
          'tier', gc.tier,
          'animation_key', gc.animation_key,
          'certificate_title', gc.certificate_title
        )
      ) order by cg.gifted_at desc)
      from public.child_gifts cg
      join public.gift_catalog gc on gc.id = cg.gift_catalog_id
      where cg.student_id = v_student.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
