import type { MatnVerse } from "../../components/MatnTextDisplay";

export type QuranPlan = {
  id: string;
  title: string;
  status: string;
  daily_target: number;
  start_date: string | null;
  due_date: string | null;
  surah_number: number | null;
  duration_days: number | null;
  content_kind: string | null;
  subject_category: string | null;
  catalog_item_id: string | null;
  source_name: string | null;
};

export type QuranSegment = {
  id: string;
  plan_id: string;
  portion_label: string | null;
  uthmani_text: string | null;
  readable_text: string | null;
  status: string;
  achievement_points: number;
  reward_points: number;
  notes: string | null;
  scheduled_date: string | null;
  day_number: number | null;
  from_ayah: number | null;
  to_ayah: number | null;
  surah_number: number | null;
  catalog_unit_from: number | null;
  catalog_unit_to: number | null;
  chapter_title: string | null;
  has_audio: boolean;
  audio_submitted_at: string | null;
  audio_duration_seconds: number | null;
};

export type ReligiousChapter = {
  id: string;
  chapter_number: number;
  title: string;
  units: MatnVerse[];
};

export type ReligiousContent = {
  catalog_id: string;
  title: string;
  short_title: string;
  author: string | null;
  science_category: string;
  source_name: string | null;
  source_note: string | null;
  chapters: ReligiousChapter[];
};

export type QuranData = {
  plans: QuranPlan[];
  segments: QuranSegment[];
  religious_content: ReligiousContent[];
};

export type PlanGroup = {
  plan: QuranPlan;
  segments: QuranSegment[];
  current: QuranSegment | null;
  assignedCount: number;
  waitingCount: number;
  masteredCount: number;
  progress: number;
};

export type MatnViewMode = "current" | "chapter" | "full";

export const statusLabels: Record<string, string> = {
  assigned: "مطلوب حفظه",
  memorized: "أُرسل للتسميع",
  recited: "قيد الاعتماد",
  mastered: "متقن",
  needs_revision: "يحتاج مراجعة"
};

export function localToday() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function formatDate(value: string | null) {
  if (!value) return "دون تاريخ";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(`${value}T00:00:00`));
}

export function segmentSortValue(segment: QuranSegment) {
  const dateValue = segment.scheduled_date
    ? new Date(`${segment.scheduled_date}T00:00:00`).getTime()
    : Number.MAX_SAFE_INTEGER;
  return dateValue + Number(segment.day_number || 0);
}

export function pickCurrentSegment(segments: QuranSegment[], today: string) {
  const sorted = [...segments].sort((a, b) => segmentSortValue(a) - segmentSortValue(b));
  return sorted.find((item) => item.status === "needs_revision")
    || sorted.find((item) => item.status === "assigned" && (!item.scheduled_date || item.scheduled_date <= today))
    || sorted.find((item) => item.status === "assigned")
    || sorted.find((item) => ["memorized", "recited"].includes(item.status))
    || sorted.find((item) => item.status === "mastered")
    || null;
}

export function fallbackMatnVerses(segment: QuranSegment): MatnVerse[] {
  const blocks = (segment.readable_text || segment.uthmani_text || "")
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const start = segment.catalog_unit_from || 1;
  return blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    return {
      unit_number: start + index,
      first_part: lines[0] || block,
      second_part: lines.slice(1).join(" ") || null,
      full_text: block
    };
  });
}
