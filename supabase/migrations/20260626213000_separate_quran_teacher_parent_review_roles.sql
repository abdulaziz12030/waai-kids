create or replace function public.get_my_portal_type()
returns text
language sql
security definer
set search_path = public
as $function$
  select case
    when exists (
      select 1
      from public.organizations o
      where o.owner_id = auth.uid()
        and o.type = 'family'
    ) then 'family'
    when exists (
      select 1
      from public.organizations o
      where o.owner_id = auth.uid()
        and o.type in ('independent_teacher','halaqa','school')
    ) or exists (
      select 1
      from public.teacher_student_links l
      where l.teacher_user_id = auth.uid()
        and l.status = 'active'
    ) or exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'teacher'
        and m.is_active = true
    ) then 'teacher'
    else 'new'
  end
$function$;

create or replace function public.get_quran_review_queue()
returns jsonb
language sql
security definer
set search_path = public
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'segment_id', qs.id,
    'student_id', s.id,
    'student_name', s.full_name,
    'plan_title', qp.title,
    'portion_label', qs.portion_label,
    'uthmani_text', qs.uthmani_text,
    'readable_text', qs.readable_text,
    'status', qs.status,
    'achievement_points', qs.achievement_points,
    'reward_points', qs.reward_points,
    'notes', qs.notes,
    'memorized_at', qs.memorized_at,
    'has_audio', exists(
      select 1 from public.quran_audio_submissions qa
      where qa.segment_id = qs.id
    ),
    'audio_submitted_at', (
      select qa.submitted_at from public.quran_audio_submissions qa
      where qa.segment_id = qs.id
    ),
    'audio_duration_seconds', (
      select qa.duration_seconds from public.quran_audio_submissions qa
      where qa.segment_id = qs.id
    ),
    'review_mode', case
      when public.is_organization_owner(s.organization_id)
           and exists (
             select 1 from public.teacher_student_links atl
             where atl.student_id = s.id and atl.status = 'active'
           ) then 'parent_final'
      when public.is_organization_owner(s.organization_id) then 'parent_full'
      else 'teacher'
    end,
    'has_active_teacher', exists (
      select 1 from public.teacher_student_links atl
      where atl.student_id = s.id and atl.status = 'active'
    ),
    'latest_mistakes_count', latest_review.mistakes_count,
    'latest_fluency_score', latest_review.fluency_score,
    'latest_tajweed_score', latest_review.tajweed_score,
    'latest_review_notes', latest_review.notes,
    'latest_reviewer_type', latest_review.reviewer_type,
    'latest_reviewed_at', latest_review.attempted_at,
    'teacher_mistakes_count', teacher_review.mistakes_count,
    'teacher_fluency_score', teacher_review.fluency_score,
    'teacher_tajweed_score', teacher_review.tajweed_score,
    'teacher_review_notes', teacher_review.notes,
    'teacher_reviewed_at', teacher_review.attempted_at
  ) order by qs.memorized_at nulls last, qs.created_at), '[]'::jsonb)
  from public.quran_segments qs
  join public.quran_plans qp on qp.id = qs.plan_id
  join public.students s on s.id = qp.student_id
  left join lateral (
    select qr.mistakes_count, qr.fluency_score, qr.tajweed_score,
           qr.notes, qr.reviewer_type, qr.attempted_at
    from public.quran_recitations qr
    where qr.segment_id = qs.id
    order by qr.attempted_at desc, qr.created_at desc
    limit 1
  ) latest_review on true
  left join lateral (
    select qr.mistakes_count, qr.fluency_score, qr.tajweed_score,
           qr.notes, qr.attempted_at
    from public.quran_recitations qr
    where qr.segment_id = qs.id
      and qr.reviewer_type = 'teacher'
      and qr.result = 'passed'
    order by qr.attempted_at desc, qr.created_at desc
    limit 1
  ) teacher_review on true
  where (
    public.is_organization_owner(s.organization_id)
    and (
      (
        exists (
          select 1 from public.teacher_student_links atl
          where atl.student_id = s.id and atl.status = 'active'
        )
        and qs.status = 'recited'
      )
      or
      (
        not exists (
          select 1 from public.teacher_student_links atl
          where atl.student_id = s.id and atl.status = 'active'
        )
        and qs.status in ('memorized','recited')
      )
    )
  ) or (
    exists (
      select 1 from public.teacher_student_links l
      where l.student_id = s.id
        and l.teacher_user_id = auth.uid()
        and l.status = 'active'
    )
    and qs.status = 'memorized'
  )
$function$;

create or replace function public.review_quran_segment_shared(
  p_segment_id uuid,
  p_status text,
  p_mistakes_count integer default 0,
  p_fluency_score integer default null,
  p_tajweed_score integer default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_org_id uuid;
  v_achievement integer;
  v_reward integer;
  v_old_status public.quran_progress_status;
  v_is_owner boolean;
  v_is_teacher boolean;
  v_has_active_teacher boolean;
  v_reviewer_type text;
  v_is_parent_final boolean;
begin
  select qp.student_id, qp.organization_id, qs.achievement_points,
         qs.reward_points, qs.status
  into v_student_id, v_org_id, v_achievement, v_reward, v_old_status
  from public.quran_segments qs
  join public.quran_plans qp on qp.id = qs.plan_id
  where qs.id = p_segment_id;

  if v_student_id is null then
    raise exception 'المقطع غير موجود';
  end if;

  v_is_owner := public.is_organization_owner(v_org_id);

  select exists (
    select 1
    from public.teacher_student_links l
    where l.student_id = v_student_id
      and l.teacher_user_id = auth.uid()
      and l.status = 'active'
  ) into v_is_teacher;

  select exists (
    select 1
    from public.teacher_student_links l
    where l.student_id = v_student_id
      and l.status = 'active'
  ) into v_has_active_teacher;

  if not coalesce(v_is_owner, false) and not coalesce(v_is_teacher, false) then
    raise exception 'غير مصرح لك بمراجعة هذا المقطع';
  end if;

  if p_status not in ('recited','mastered','needs_revision') then
    raise exception 'حالة التسميع غير صحيحة';
  end if;

  if p_fluency_score is not null and (p_fluency_score < 0 or p_fluency_score > 100) then
    raise exception 'درجة الطلاقة يجب أن تكون بين 0 و100';
  end if;

  if p_tajweed_score is not null and (p_tajweed_score < 0 or p_tajweed_score > 100) then
    raise exception 'درجة التجويد يجب أن تكون بين 0 و100';
  end if;

  v_is_parent_final := v_is_owner and v_has_active_teacher;

  if v_is_teacher and not v_is_owner then
    if p_status not in ('recited','needs_revision') then
      raise exception 'المعلم يقيّم التسميع، واعتماد الإتقان النهائي من صلاحية ولي الأمر';
    end if;
    if v_old_status <> 'memorized' then
      raise exception 'لا يوجد تسميع جديد بانتظار تقييم المعلم';
    end if;
    v_reviewer_type := 'teacher';
  elsif v_is_parent_final then
    if p_status not in ('mastered','needs_revision') then
      raise exception 'بعد ارتباط المعلم، يختص ولي الأمر بالاعتماد النهائي أو الإعادة للمراجعة';
    end if;
    if v_old_status <> 'recited' then
      raise exception 'يلزم اجتياز تقييم المعلم قبل اعتماد الإتقان';
    end if;
    v_reviewer_type := 'family_approval';
  else
    if v_old_status not in ('memorized','recited') then
      raise exception 'لا يوجد تسميع جاهز للمراجعة';
    end if;
    v_reviewer_type := 'family';
  end if;

  update public.quran_segments
  set status = p_status::public.quran_progress_status,
      memorized_at = coalesce(memorized_at, now()),
      recited_at = case
        when p_status in ('recited','mastered') then coalesce(recited_at, now())
        else recited_at
      end,
      mastered_at = case
        when p_status = 'mastered' then coalesce(mastered_at, now())
        when p_status = 'needs_revision' then null
        else mastered_at
      end,
      approved_by = case
        when p_status = 'mastered' then auth.uid()
        when p_status = 'needs_revision' then null
        else approved_by
      end,
      last_review_at = now(),
      review_count = review_count + 1
  where id = p_segment_id;

  insert into public.quran_recitations(
    segment_id, student_id, reviewer_id, reviewer_type, result,
    mistakes_count, fluency_score, tajweed_score, notes
  ) values (
    p_segment_id,
    v_student_id,
    auth.uid(),
    v_reviewer_type,
    case when p_status = 'needs_revision' then 'needs_revision' else 'passed' end,
    greatest(coalesce(p_mistakes_count, 0), 0),
    case when v_is_parent_final then null else p_fluency_score end,
    case when v_is_parent_final then null else p_tajweed_score end,
    nullif(trim(p_notes), '')
  );

  if p_status = 'mastered' and v_old_status <> 'mastered' then
    if v_achievement > 0 and not exists (
      select 1
      from public.points_ledger
      where student_id = v_student_id
        and source_type = 'quran_segment'
        and source_id = p_segment_id
        and point_type = 'achievement'
    ) then
      insert into public.points_ledger(
        organization_id, student_id, source_type, source_id,
        points, note, created_by, point_type
      ) values (
        v_org_id, v_student_id, 'quran_segment', p_segment_id,
        v_achievement,
        case
          when v_has_active_teacher then 'إتقان مقطع قرآن بعد تقييم المعلم واعتماد ولي الأمر'
          else 'إتقان مقطع قرآن باعتماد ولي الأمر'
        end,
        auth.uid(), 'achievement'
      );

      update public.students
      set achievement_points = achievement_points + v_achievement,
          points_balance = points_balance + v_achievement,
          updated_at = now()
      where id = v_student_id;
    end if;

    if v_reward > 0 and not exists (
      select 1
      from public.points_ledger
      where student_id = v_student_id
        and source_type = 'quran_segment'
        and source_id = p_segment_id
        and point_type = 'reward'
    ) then
      insert into public.points_ledger(
        organization_id, student_id, source_type, source_id,
        points, note, created_by, point_type
      ) values (
        v_org_id, v_student_id, 'quran_segment', p_segment_id,
        v_reward, 'مكافأة إتقان مقطع قرآن', auth.uid(), 'reward'
      );

      update public.students
      set reward_points = reward_points + v_reward,
          updated_at = now()
      where id = v_student_id;
    end if;
  end if;
end;
$function$;

revoke all on function public.get_my_portal_type() from public;
revoke all on function public.get_quran_review_queue() from public;
revoke all on function public.review_quran_segment_shared(uuid,text,integer,integer,integer,text) from public;
grant execute on function public.get_my_portal_type() to authenticated;
grant execute on function public.get_quran_review_queue() to authenticated;
grant execute on function public.review_quran_segment_shared(uuid,text,integer,integer,integer,text) to authenticated;
