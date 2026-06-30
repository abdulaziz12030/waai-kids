#!/usr/bin/env python3
"""Generate the Sullam al-Wusul JSON from Arabic Wikisource."""

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
    return text == "افتتاح" or text.startswith(("مقدمة:", "فصل:", "خاتمة:"))


def heading_anchor(heading: Tag) -> Tag:
    parent = heading.parent
    if isinstance(parent, Tag) and "mw-heading" in (parent.get("class") or []):
        return parent
    return heading


def contains_section_heading(node: Tag) -> bool:
    if node.name in {"h2", "h3"}:
        return True
    classes = node.get("class") or []
    return "mw-heading" in classes and node.find(["h2", "h3"], recursive=False) is not None


def direct_section_nodes(heading: Tag) -> list[Tag]:
    nodes: list[Tag] = []
    for sibling in heading_anchor(heading).next_siblings:
        if isinstance(sibling, NavigableString):
            continue
        if not isinstance(sibling, Tag):
            continue
        if contains_section_heading(sibling):
            break
        nodes.append(sibling)
    return nodes


def valid_line(value: str) -> bool:
    if not value or value in {"عدل", "هامش", "=", "–", "—"}:
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
        tables = [node] if node.name == "table" else node.find_all("table")
        for table in tables:
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"], recursive=False)
                row_lines = [clean_line(cell.get_text("\n", strip=True)) for cell in cells]
                for value in row_lines:
                    lines.extend(split_text(value))
    return lines


def extract_poem_blocks(nodes: Iterable[Tag]) -> list[str]:
    lines: list[str] = []
    selectors = [".poem-line", ".verse", ".hemistich", ".ws-poem-line", "p", "dd"]
    for node in nodes:
        for selector in selectors:
            for block in node.select(selector):
                if block.find_parent("table") is not None:
                    continue
                lines.extend(split_text(block.get_text("\n", strip=True)))
    return lines


def extract_visible(nodes: Iterable[Tag]) -> list[str]:
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
    table = dedupe_adjacent(extract_table_rows(nodes))
    poem = dedupe_adjacent(extract_poem_blocks(nodes))
    visible = dedupe_adjacent(extract_visible(nodes))
    combined = dedupe_adjacent(table + [line for line in poem if line not in table])
    candidates = [table, combined, poem, visible]
    unique: list[list[str]] = []
    for candidate in candidates:
        if candidate and candidate not in unique:
            unique.append(candidate)
    return unique


def choose_chapter_lines(chapter_candidates: list[list[list[str]]]) -> list[list[str]]:
    target = EXPECTED_VERSES * 2
    even_candidates = [[item for item in candidates if len(item) % 2 == 0] for candidates in chapter_candidates]

    # Arabic Wikisource currently exposes one clear table candidate per chapter.
    # The final chapter is followed by a small page-information block that can be
    # collected with the poem. Trim only that final trailing surplus, while the
    # fixed 290-verse validation remains the source of truth.
    if all(len(options) == 1 for options in even_candidates):
        selected = [list(options[0]) for options in even_candidates]
        total = sum(len(lines) for lines in selected)
        excess = total - target
        if excess == 0:
            return selected
        if 0 < excess <= 12 and excess % 2 == 0 and len(selected[-1]) > excess:
            selected[-1] = selected[-1][:-excess]
            if sum(len(lines) for lines in selected) == target:
                print(f"Trimmed {excess} trailing non-poem lines from the final chapter.")
                return selected

    states: dict[int, list[list[str]]] = {0: []}
    for chapter_options in even_candidates:
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
        params={"action": "parse", "page": PAGE_TITLE, "prop": "text", "format": "json", "formatversion": "2"},
        headers={"User-Agent": "WaaiKidsContentImporter/1.0 (educational project)"},
        timeout=45,
    )
    response.raise_for_status()
    html = response.json()["parse"]["text"]
    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(".mw-parser-output") or soup

    headings = [heading for heading in root.find_all("h3") if is_content_heading(heading.get_text(" ", strip=True))]
    if len(headings) != 15:
        raise RuntimeError(f"Expected 15 content chapters, found {len(headings)}: {[h.get_text(' ', strip=True) for h in headings]}")

    chapter_titles: list[str] = []
    chapter_candidates: list[list[list[str]]] = []
    for heading in headings:
        chapter_titles.append(normalize_space(heading.get_text(" ", strip=True)))
        chapter_candidates.append(candidate_section_lines(direct_section_nodes(heading)))

    chosen_lines = choose_chapter_lines(chapter_candidates)
    chapters: list[dict[str, object]] = []
    verse_number = 0
    for chapter_number, (title, lines) in enumerate(zip(chapter_titles, chosen_lines, strict=True), start=1):
        verses: list[dict[str, object]] = []
        for index in range(0, len(lines), 2):
            verse_number += 1
            first, second = lines[index], lines[index + 1]
            verses.append({
                "verse_number": verse_number,
                "first_hemistich": first,
                "second_hemistich": second,
                "full_text": f"{first}\n{second}",
            })
        chapters.append({"chapter_number": chapter_number, "title": title, "sort_order": chapter_number, "verses": verses})

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
