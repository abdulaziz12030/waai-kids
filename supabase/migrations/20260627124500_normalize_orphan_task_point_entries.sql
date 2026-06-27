update public.points_ledger pl
set points = 0,
    note = coalesce(pl.note, '') || ' · تمت تسوية السجل بعد إزالة المهمة'
where pl.source_type = 'task'
  and pl.source_id is not null
  and not exists (
    select 1 from public.tasks t where t.id = pl.source_id
  );

update public.students s
set achievement_points = coalesce((
      select sum(pl.points)
      from public.points_ledger pl
      where pl.student_id = s.id
        and pl.point_type = 'achievement'
    ), 0),
    reward_points = coalesce((
      select sum(pl.points)
      from public.points_ledger pl
      where pl.student_id = s.id
        and pl.point_type = 'reward'
    ), 0),
    points_balance = coalesce((
      select sum(pl.points)
      from public.points_ledger pl
      where pl.student_id = s.id
        and pl.point_type = 'achievement'
    ), 0),
    updated_at = now();
