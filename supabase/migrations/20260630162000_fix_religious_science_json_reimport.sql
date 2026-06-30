create or replace function public.import_religious_science_json(p_document jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_catalog_id uuid;
  v_chapter jsonb;
  v_verse jsonb;
  v_chapter_id uuid;
  v_chapter_count integer := 0;
  v_unit_count integer := 0;
begin
  if coalesce(p_document->>'slug', '') = '' then
    raise exception 'slug is required';
  end if;

  insert into public.religious_science_catalog(
    slug, title, short_title, author, science_category, content_type,
    description, age_min, age_max, source_name, source_url,
    source_note, is_active, sort_order, metadata
  ) values (
    p_document->>'slug',
    p_document->>'title',
    coalesce(p_document->>'short_title', p_document->>'title'),
    p_document->>'author',
    coalesce(p_document->>'science_category', 'علوم دينية'),
    coalesce(p_document->>'content_type', 'matn'),
    p_document->>'description',
    nullif(p_document#>>'{target_age,min}', '')::integer,
    nullif(p_document#>>'{target_age,max}', '')::integer,
    coalesce(p_document#>>'{source,name}', 'مكتبة واعي كيدز'),
    p_document#>>'{source,url}',
    p_document#>>'{source,license_note}',
    coalesce((p_document->>'is_active')::boolean, true),
    coalesce((p_document->>'sort_order')::integer, 0),
    coalesce(p_document->'source', '{}'::jsonb) || jsonb_build_object('schema_version', p_document->>'schema_version')
  )
  on conflict (slug) do update set
    title = excluded.title,
    short_title = excluded.short_title,
    author = excluded.author,
    science_category = excluded.science_category,
    content_type = excluded.content_type,
    description = excluded.description,
    age_min = excluded.age_min,
    age_max = excluded.age_max,
    source_name = excluded.source_name,
    source_url = excluded.source_url,
    source_note = excluded.source_note,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_catalog_id;

  delete from public.religious_science_units where catalog_id = v_catalog_id;
  delete from public.religious_science_chapters where catalog_id = v_catalog_id;

  for v_chapter in
    select value from jsonb_array_elements(coalesce(p_document->'chapters', '[]'::jsonb))
  loop
    insert into public.religious_science_chapters(catalog_id, chapter_number, title, sort_order)
    values (
      v_catalog_id,
      (v_chapter->>'chapter_number')::integer,
      v_chapter->>'title',
      coalesce((v_chapter->>'sort_order')::integer, (v_chapter->>'chapter_number')::integer)
    ) returning id into v_chapter_id;
    v_chapter_count := v_chapter_count + 1;

    for v_verse in
      select value from jsonb_array_elements(coalesce(v_chapter->'verses', '[]'::jsonb))
    loop
      insert into public.religious_science_units(
        catalog_id, chapter_id, unit_number, first_part, second_part,
        full_text, sort_order, metadata
      ) values (
        v_catalog_id,
        v_chapter_id,
        (v_verse->>'verse_number')::integer,
        v_verse->>'first_hemistich',
        v_verse->>'second_hemistich',
        coalesce(v_verse->>'full_text', (v_verse->>'first_hemistich') || E'\n' || (v_verse->>'second_hemistich')),
        (v_verse->>'verse_number')::integer,
        jsonb_build_object('source_verse_number', (v_verse->>'verse_number')::integer)
      );
      v_unit_count := v_unit_count + 1;
    end loop;
  end loop;

  update public.religious_science_catalog
  set metadata = metadata || jsonb_build_object(
    'loaded_verses', v_unit_count,
    'loaded_chapters', v_chapter_count,
    'imported_at', now()
  )
  where id = v_catalog_id;

  return jsonb_build_object(
    'catalog_id', v_catalog_id,
    'chapters', v_chapter_count,
    'units', v_unit_count
  );
end;
$function$;
