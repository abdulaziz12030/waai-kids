update public.religious_science_units u
set first_part = case u.unit_number
      when 87 then 'مَنْ قالَها مُعْتَقِدًا مَعْناها'
      when 144 then 'فَخالَفُوهُ جَهْرَةً وارْتَكَبُوا'
      else u.first_part end,
    second_part = case u.unit_number
      when 87 then 'وكانَ عامِلًا بِمُقْتَضاها'
      when 144 then 'ما قَدْ نَهى عَنْهُ ولَمْ يَجْتَنِبُوا'
      else u.second_part end,
    full_text = case u.unit_number
      when 87 then 'مَنْ قالَها مُعْتَقِدًا مَعْناها' || E'\n' || 'وكانَ عامِلًا بِمُقْتَضاها'
      when 144 then 'فَخالَفُوهُ جَهْرَةً وارْتَكَبُوا' || E'\n' || 'ما قَدْ نَهى عَنْهُ ولَمْ يَجْتَنِبُوا'
      else u.full_text end,
    metadata = coalesce(u.metadata, '{}'::jsonb) || jsonb_build_object('diacritics_reviewed', true)
from public.religious_science_catalog c
where c.id = u.catalog_id
  and c.slug = 'sullam-al-wusul'
  and u.unit_number in (87, 144);

update public.religious_science_catalog
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'diacritics_display', 'preserved_from_source_with_two_reviewed_overrides',
  'diacritics_reviewed_units', jsonb_build_array(87, 144)
)
where slug = 'sullam-al-wusul';
