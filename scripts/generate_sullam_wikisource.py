#!/usr/bin/env python3
"""Generate the Sullam al-Wusul religious-science JSON from Arabic Wikisource.

The script deliberately validates the published 290-verse count before writing
anything, so a Wikisource markup change cannot silently corrupt the library.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterable

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

PAGE_TITLE = "سلم الوصول إلى علم الأصول"
PAGE_URL = "https://ar.wikisource.org/wiki/%D8%B3%D9%84%D9%85_%D8%A7%D9%84%D9%88%D8%B5%D9%88%D9%84_%D8%A5%D9%84%D9%89_%D8%B9%D9%84%D9%85_%D8%A7%D9%84%D8%A3%D8%B5%D9%88%D9%84"
API_URL = "https://ar.wikisource.org/w/api.php"
OUTPUT_PATH = Path("public/content/religious-sciences/sullam-al-wusul.json")
EXPECTED_VERSES = 290

ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def normalize_space(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\u200f", "").replace("\u200e", "")
    value = re.sub(r"[ \t]+", " ", value)
    return value.strip()


def clean_line(value: str) -> str:
    value = normalize_space(value)
    value = re.sub(r"\[\s*[0-9%s]+\s*\]" % ARABIC_DIGITS, "", value)
    value = re.sub(r"^[►◄=|·•]+|[►◄=|]+$", "", value).strip()
    return normalize_space(value)


def is_content_heading(text: str) -> bool:
    text = normalize_space(text)
    return (
        text == "افتتاح"
        or text.startswith("مقدمة:")
        or text.startswith("فصل:")
        or text.startswith("خاتمة:")
    )


def direct_section_nodes(heading: Tag) -> list[Tag]:
    nodes: list[Tag] = []
    for sibling in heading.next_siblings:
        if isinstance(sibling, NavigableString):
            continue
        if not isinstance(sibling, Tag):
            continue
        if sibling.name in {"h2", "h3"}:
            break
        nodes.append(sibling)
    return nodes


def valid_line(value: str) -> bool:
    if not value:
        return False
    if value in {"عدل", "هامش"}:
        return False
    if re.fullmatch(r"[0-9%s]+" % ARABIC_DIGITS, value):
        return False
    if value.startswith("أُرجُوزَةٌ فِي التَّوحِيدِ"):
        return False
    return bool(re.search(r"[\u0600-\u06ff]", value))


def split_text(value: str) -> list[str]:
    return [line for line in (clean_line(item) for item in value.splitlines()) if valid_line(line)]


def extract_table_rows(nodes: Iterable[Tag]) -> list[str]:
    lines: list[str] = []
    for node in nodes:
        tables = [node] if node.name == "table" else node.find_all("table", recursive=False)
        for table in tables:
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"], recursive=False)
                row_lines = [clean_line(cell.get_text(" ", strip=True)) for cell in cells]
                row_lines = [line for line in row_lines if valid_line(line) and line not in {"=", "–", "—"}]
                lines.extend(row_lines)
    return lines


def extract_leaf_blocks(nodes: Iterable[Tag]) -> list[str]:
    lines: list[str] = []
    for node in nodes:
        # Prefer semantic poem/verse line containers when present.
        selectors = [
            ".poem-line",
            ".verse",
            ".hemistich",
            "p",
            "dd",
            "li",
        ]
        matched: list[Tag] = []
        for selector in selectors:
            matched.extend(node.select(selector))
        seen: set[int] = set()
        for block in matched:
            if id(block) in seen or block.find_parent("table") is not None:
                continue
            seen.add(id(block))
            lines.extend(split_text(block.get_text("\n", strip=True)))
    return lines


def extract_all_visible(nodes: Iterable[Tag]) -> list[str]:
    lines: list[str] = []
    for node in nodes:
        clone = BeautifulSoup(str(node), "html.parser")
        for selector in ["sup", ".reference", ".mw-editsection", "style", "script", "noscript"]:
            for item in clone.select(selector):
                item.decompose()
        lines.extend(split_text(clone.get_text("\n", strip=True)))
    return lines


def dedupe_adjacent(lines: list[str]) -> list[str]:
    result: list[str] = []
    for line in lines:
        if not result or result[-1] != line:
            result.append(line)
    return result


def candidate_section_lines(nodes: list[Tag]) -> list[list[str]]:
    table = extract_table_rows(nodes)
    leaf = extract_leaf_blocks(nodes)
    visible = extract_all_visible(nodes)
    combined = table + [line for line in leaf if line not in table]
    candidates = [
        dedupe_adjacent(table),
        dedupe_adjacent(combined),
        dedupe_adjacent(leaf),
        dedupe_adjacent(visible),
    ]
    return [candidate for candidate in candidates if candidate]


def choose_chapter_lines(chapter_candidates: list[list[list[str]]]) -> list[list[str]]:
    """Try candidate combinations and select the one matching 580 hemistichs."""
    target = EXPECTED_VERSES * 2
    # Most pages use the same extraction structure for every chapter.
    for strategy_index in range(4):
        selected: list[list[str]] = []
        valid = True
        for candidates in chapter_candidates:
            if strategy_index >= len(candidates):
                valid = False
                break
            lines = candidates[strategy_index]
            if len(lines) % 2:
                valid = False
                break
            selected.append(lines)
        if valid and sum(map(len, selected)) == target:
            return selected

    # Fallback: bounded search, choosing an even candidate per chapter.
    possibilities = [[item for item in candidates if len(item) % 2 == 0] for candidates in chapter_candidates]
    states: dict[int, list[list[str]]] = {0: []}
    for chapter_options in possibilities:
        next_states: dict[int, list[list[str]]] = {}
        for current_total, chosen in states.items():
            for option in chapter_options:
                total = current_total + len(option)
                if total <= target and total not in next_states:
                    next_states[total] = chosen + [option]
        states = next_states
    if target in states:
        return states[target]

    diagnostics = [[len(item) for item in candidates] for candidates in chapter_candidates]
    raise RuntimeError(f"Could not extract exactly {target} hemistichs. Candidate counts: {diagnostics}")


def main() -> int:
    response = requests.get(
        API_URL,
        params={
            "action": "parse",
            "page": PAGE_TITLE,
            "prop": "text",
            "format": "json",
            "formatversion": "2",
        },
        headers={"User-Agent": "WaaiKidsContentImporter/1.0 (educational project)"},
        timeout=45,
    )
    response.raise_for_status()
    payload = response.json()
    html = payload["parse"]["text"]
    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(".mw-parser-output") or soup

    headings = [heading for heading in root.find_all("h3") if is_content_heading(heading.get_text(" ", strip=True))]
    if len(headings) != 15:
        raise RuntimeError(f"Expected 15 content chapters, found {len(headings)}: {[h.get_text(' ', strip=True) for h in headings]}")

    chapter_candidates: list[list[list[str]]] = []
    chapter_titles: list[str] = []
    for heading in headings:
        chapter_titles.append(normalize_space(heading.get_text(" ", strip=True)))
        nodes = direct_section_nodes(heading)
        candidates = candidate_section_lines(nodes)
        chapter_candidates.append(candidates)

    chosen_lines = choose_chapter_lines(chapter_candidates)
    chapters: list[dict[str, object]] = []
    verse_number = 0

    for chapter_number, (title, lines) in enumerate(zip(chapter_titles, chosen_lines, strict=True), start=1):
        verses: list[dict[str, object]] = []
        for index in range(0, len(lines), 2):
            verse_number += 1
            first = lines[index]
            second = lines[index + 1]
            verses.append(
                {
                    "verse_number": verse_number,
                    "first_hemistich": first,
                    "second_hemistich": second,
                    "full_text": f"{first}\n{second}",
                }
            )
        chapters.append(
            {
                "chapter_number": chapter_number,
                "title": title,
                "sort_order": chapter_number,
                "verses": verses,
            }
        )

    if verse_number != EXPECTED_VERSES:
        raise RuntimeError(f"Expected {EXPECTED_VERSES} verses, generated {verse_number}")

    document = {
        "schema_version": "1.0",
        "slug": "sullam-al-wusul",
        "title": "سُلَّم الوصول إلى علم الأصول في توحيد الله واتباع الرسول",
        "short_title": "سُلَّم الوصول",
        "author": "الشيخ حافظ بن أحمد الحكمي",
        "science_category": "العقيدة والتوحيد",
        "content_type": "poem",
        "description": "منظومة تعليمية في توحيد الله واتباع الرسول، مقسمة إلى أبواب وأبيات لتقديمها للأطفال ضمن برامج حفظ يومية متدرجة.",
        "target_age": {"min": 10, "max": 18},
        "source": {
            "name": "ويكي مصدر",
            "url": PAGE_URL,
            "license": "CC BY-SA 4.0",
            "license_url": "https://creativecommons.org/licenses/by-sa/4.0/deed.ar",
            "license_note": "المصدر: «سُلَّم الوصول إلى علم الأصول في توحيد الله واتباع الرسول»، للشيخ حافظ بن أحمد الحكمي، نقلًا عن ويكي مصدر، وفق رخصة المشاع الإبداعي CC BY-SA 4.0. أُجريت تعديلات تنسيقية لتناسب العرض في الموقع.",
            "formatting_changes": [
                "تقسيم النص إلى أبواب وأبيات مرقمة",
                "فصل شطري كل بيت ليتناسب مع العرض على الجوال",
                "إزالة عناصر التحرير والحواشي من متن الحفظ",
            ],
            "expected_verse_count": EXPECTED_VERSES,
        },
        "is_active": True,
        "sort_order": 1,
        "chapters": chapters,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {OUTPUT_PATH} with {len(chapters)} chapters and {verse_number} verses.")
    for chapter in chapters:
        print(f"- {chapter['chapter_number']}: {chapter['title']} ({len(chapter['verses'])} verses)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
