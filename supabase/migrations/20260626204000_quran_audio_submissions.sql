-- Private Quran audio submissions for child recitation review.

create table if not exists public.quran_audio_submissions (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null unique references public.quran_segments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 300),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quran_audio_submissions_student_idx
  on public.quran_audio_submissions(student_id, submitted_at desc);

alter table public.quran_audio_submissions enable row level security;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'quran-recitation-audio',
  'quran-recitation-audio',
  false,
  10485760,
  array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a','audio/aac']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.get_child_quran_dashboard(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  select cs.student_id into v_student_id
  from public.child_sessions cs
  where cs.session_token = p_session_token
    and cs.revoked_at is null and cs.expires_at > now();

  if v_student_id is null then
    raise exception 'جلسة غير صالحة';
  end if;

  update public.child_sessions
  set last_seen_at = now()
  where session_token = p_session_token;

  select jsonb_build_object(
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qp.id,
        'title', qp.title,
        'status', qp.status,
        'daily_target', qp.daily_target,
        'start_date', qp.start_date,
        'due_date', qp.due_date,
        'surah_number', qp.surah_number,
        'duration_days', qp.duration_days
      ) order by qp.created_at desc)
      from public.quran_plans qp
      where qp.student_id = v_student_id
    ), '[]'::jsonb),
    'segments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qs.id,
        'plan_id', qs.plan_id,
        'portion_label', qs.portion_label,
        'uthmani_text', qs.uthmani_text,
        'readable_text', qs.readable_text,
        'status', qs.status,
        'achievement_points', qs.achievement_points,
        'reward_points', qs.reward_points,
        'notes', qs.notes,
        'scheduled_date', qs.scheduled_date,
        'day_number', qs.day_number,
        'from_ayah', qs.from_ayah,
        'to_ayah', qs.to_ayah,
        'surah_number', qs.surah_number,
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
        )
      ) order by qs.scheduled_date nulls last, qs.day_number nulls last, qs.created_at asc)
      from public.quran_segments qs
      join public.quran_plans qp on qp.id = qs.plan_id
      where qp.student_id = v_student_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
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
    )
  ) order by qs.memorized_at nulls last, qs.created_at), '[]'::jsonb)
  from public.quran_segments qs
  join public.quran_plans qp on qp.id = qs.plan_id
  join public.students s on s.id = qp.student_id
  where qs.status in ('memorized','recited','needs_revision')
    and (
      public.is_organization_owner(s.organization_id)
      or exists (
        select 1 from public.teacher_student_links l
        where l.student_id = s.id
          and l.teacher_user_id = auth.uid()
          and l.status = 'active'
      )
    )
$function$;

revoke all on table public.quran_audio_submissions from anon, authenticated;
grant all on table public.quran_audio_submissions to service_role;
