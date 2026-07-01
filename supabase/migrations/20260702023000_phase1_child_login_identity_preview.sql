drop function if exists public.authenticate_child_simple(text, text);

create function public.authenticate_child_simple(p_family_code text, p_pin text)
returns table(
  session_token uuid,
  student_id uuid,
  full_name text,
  avatar text,
  photo_path text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_family_code text := upper(trim(p_family_code));
  v_student_id uuid;
  v_full_name text;
  v_avatar text;
  v_photo_path text;
  v_matches integer;
  v_token uuid;
  v_expires timestamptz;
  v_recent_failures integer;
begin
  delete from public.child_login_attempts
  where attempted_at < now() - interval '24 hours';

  select count(*) into v_recent_failures
  from public.child_login_attempts a
  where a.family_code = v_family_code
    and a.succeeded = false
    and a.attempted_at > now() - interval '15 minutes';

  if v_recent_failures >= 5 then
    raise exception 'تم إيقاف المحاولات مؤقتًا. حاول بعد 15 دقيقة';
  end if;

  select
    count(*),
    min(s.id),
    min(s.full_name),
    min(nullif(s.profile_data ->> 'avatar', '')),
    min(nullif(s.profile_data ->> 'photo_path', ''))
  into v_matches, v_student_id, v_full_name, v_avatar, v_photo_path
  from public.students s
  join public.organizations o on o.id = s.organization_id
  join public.child_access ca on ca.student_id = s.id
  where o.family_code = v_family_code
    and ca.is_enabled = true
    and extensions.crypt(p_pin, ca.pin_hash) = ca.pin_hash;

  if v_matches <> 1 or v_student_id is null then
    insert into public.child_login_attempts(family_code, child_code, succeeded)
    values (v_family_code, '', false);
    raise exception 'رمز الأسرة أو الرقم السري غير صحيح';
  end if;

  insert into public.child_login_attempts(family_code, child_code, succeeded)
  values (v_family_code, '', true);

  insert into public.child_sessions(student_id)
  values (v_student_id)
  returning child_sessions.session_token, child_sessions.expires_at
  into v_token, v_expires;

  return query
  select v_token, v_student_id, v_full_name, v_avatar, v_photo_path, v_expires;
end;
$$;

grant execute on function public.authenticate_child_simple(text, text) to anon, authenticated;
