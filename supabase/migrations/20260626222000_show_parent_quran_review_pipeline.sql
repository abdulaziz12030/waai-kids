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
    'scheduled_date', qs.scheduled_date,
    'day_number', qs.day_number,
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
           )
           and qs.status = 'memorized' then 'parent_waiting_teacher'
      when public.is_organization_owner(s.organization_id)
           and exists (
             select 1 from public.teacher_student_links atl
             where atl.student_id = s.id and atl.status = 'active'
           )
           and qs.status = 'recited' then 'parent_final'
      when public.is_organization_owner(s.organization_id)
           and qs.status = 'needs_revision' then 'parent_revision'
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
  ) order by
    case
      when qs.status = 'recited' then 1
      when qs.status = 'memorized' then 2
      when qs.status = 'needs_revision' then 3
      else 4
    end,
    qs.memorized_at desc nulls last,
    qs.scheduled_date nulls last,
    qs.created_at desc), '[]'::jsonb)
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
    and qs.status in ('memorized','recited','needs_revision')
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

revoke all on function public.get_quran_review_queue() from public;
grant execute on function public.get_quran_review_queue() to authenticated;
