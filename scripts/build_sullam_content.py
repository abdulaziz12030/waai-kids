#!/usr/bin/env python3
"""Build and validate the production Sullam al-Wusul JSON."""

from __future__ import annotations

import json
from pathlib import Path

import generate_sullam_wikisource as generator

EXPECTED_CHAPTERS = 15
EXPECTED_VERSES = 290
EXPECTED_FIRST = (
    "أَبدأُ باسمِ اللهِ مُستعينَا",
    "راضٍ به مُدبرًا مُعِينَا",
)
EXPECTED_LAST = (
    "أبياتُها (يُسرٌ) بِعَدِّ الجُمَّلِ",
    "تأريخها (الغُفرانُ) فافهَم وادعُ لي",
)


def main() -> int:
    # Build from the live Wikisource page, then enforce the verified boundaries.
    generator.main()
    path = Path(generator.OUTPUT_PATH)
    document = json.loads(path.read_text(encoding="utf-8"))

    chapters = document.get("chapters", [])
    verses = [verse for chapter in chapters for verse in chapter.get("verses", [])]
    if len(chapters) != EXPECTED_CHAPTERS or len(verses) != EXPECTED_VERSES:
        raise RuntimeError(
            f"Invalid Sullam structure: chapters={len(chapters)}, verses={len(verses)}"
        )

    first = verses[0]
    if (first.get("first_hemistich"), first.get("second_hemistich")) != EXPECTED_FIRST:
        raise RuntimeError("The first verse no longer matches the verified Wikisource text")

    # Inline references in the final Wikisource row split its two source lines
    # into extra table cells. Restore the two complete lines after extraction.
    last = verses[-1]
    last["first_hemistich"] = EXPECTED_LAST[0]
    last["second_hemistich"] = EXPECTED_LAST[1]
    last["full_text"] = "\n".join(EXPECTED_LAST)

    source = document.get("source", {})
    required_note = (
        "المصدر: «سُلَّم الوصول إلى علم الأصول في توحيد الله واتباع الرسول»، "
        "للشيخ حافظ بن أحمد الحكمي، نقلًا عن ويكي مصدر، وفق رخصة المشاع "
        "الإبداعي CC BY-SA 4.0. أُجريت تعديلات تنسيقية لتناسب العرض في الموقع."
    )
    if source.get("license") != "CC BY-SA 4.0" or source.get("license_note") != required_note:
        raise RuntimeError("Source attribution or license metadata is incomplete")

    path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Validated {EXPECTED_CHAPTERS} chapters and {EXPECTED_VERSES} verses.")
    print("First verse:", verses[0]["full_text"].replace("\n", " / "))
    print("Last verse:", verses[-1]["full_text"].replace("\n", " / "))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
