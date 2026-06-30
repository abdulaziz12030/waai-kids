do $block$
declare
  v_plan record;
  v_total_units integer;
  v_duration integer;
  v_scheduled_days integer;
  v_base_size integer;
  v_extra_days integer;
  v_day integer;
  v_from_row integer;
  v_to_row integer;
  v_segment_size integer;
  v_schedule_offset integer;
  v_text text;
  v_first_unit integer;
  v_last_unit integer;
  v_chapter_title text;
  v_achievement_points integer;
  v_reward_points integer;
  v_notes text;
begin
  for v_plan in
    select qp.*
    from public.quran_plans qp
    where qp.content_kind = 'matn'
      and qp.catalog_item_id is not null
      and qp.status = 'active'
      and not exists (
        select 1 from public.quran_segments qs
        where qs.plan_id = qp.id and qs.status <> 'assigned'
      )
      and not exists (
        select 1
        from public.quran_segments qs
        join public.quran_audio_submissions qa on qa.segment_id = qs.id
        where qs.plan_id = qp.id
      )
  loop
    select count(*)::integer into v_total_units
    from public.religious_science_units u
    where u.catalog_id = v_plan.catalog_item_id;

    if coalesce(v_total_units, 0) < 1 then continue; end if;

    select coalesce(max(qs.achievement_points), 10),
           coalesce(max(qs.reward_points), 0),
           max(qs.notes)
    into v_achievement_points, v_reward_points, v_notes
    from public.quran_segments qs
    where qs.plan_id = v_plan.id;

    v_duration := greatest(least(coalesce(v_plan.duration_days, 30), 365), 1);
    v_scheduled_days := least(v_duration, greatest(1, floor(v_total_units::numeric / 2)::integer));
    v_base_size := floor(v_total_units::numeric / v_scheduled_days)::integer;
    v_extra_days := mod(v_total_units, v_scheduled_days);
    v_from_row := 1;

    delete from public.quran_segments where plan_id = v_plan.id;

    update public.quran_plans
    set daily_target = ceil(v_total_units::numeric / v_scheduled_days)::integer,
        due_date = coalesce(start_date, current_date) + (v_duration - 1),
        source_version = '1.1',
        updated_at = now()
    where id = v_plan.id;

    if v_plan.goal_id is not null then
      update public.goals
      set target_points = greatest(v_achievement_points, 0) * v_scheduled_days,
          due_date = coalesce(v_plan.start_date, current_date) + (v_duration - 1),
          progress = 0,
          updated_at = now()
      where id = v_plan.goal_id;
    end if;

    for v_day in 1..v_scheduled_days loop
      v_segment_size := v_base_size + case when v_day <= v_extra_days then 1 else 0 end;
      v_to_row := v_from_row + v_segment_size - 1;
      v_schedule_offset := case
        when v_scheduled_days = 1 then 0
        else floor(((v_day - 1) * (v_duration - 1))::numeric / (v_scheduled_days - 1))::integer
      end;

      with ordered as (
        select u.*, row_number() over(order by u.sort_order, u.unit_number) as rn
        from public.religious_science_units u
        where u.catalog_id = v_plan.catalog_item_id
      )
      select string_agg(o.full_text, E'\n\n' order by o.rn),
             min(o.unit_number), max(o.unit_number),
             case when count(distinct ch.title) = 1 then max(ch.title) else 'بين قسمين من المنظومة' end
      into v_text, v_first_unit, v_last_unit, v_chapter_title
      from ordered o
      left join public.religious_science_chapters ch on ch.id = o.chapter_id
      where o.rn between v_from_row and v_to_row;

      insert into public.quran_segments(
        plan_id, surah_number, portion_label, uthmani_text, readable_text,
        status, achievement_points, reward_points, notes, scheduled_date,
        day_number, catalog_unit_from, catalog_unit_to, chapter_title
      ) values (
        v_plan.id, null,
        'المقطع ' || v_day || ' — ' || coalesce(v_chapter_title, v_plan.title) || ' — ' ||
        case when v_first_unit = v_last_unit then 'البيت ' || v_first_unit else 'الأبيات ' || v_first_unit || '–' || v_last_unit end,
        v_text, v_text, 'assigned', greatest(v_achievement_points, 0),
        greatest(v_reward_points, 0), v_notes,
        coalesce(v_plan.start_date, current_date) + v_schedule_offset,
        v_day, v_first_unit, v_last_unit, v_chapter_title
      );

      v_from_row := v_to_row + 1;
    end loop;
  end loop;
end;
$block$;
