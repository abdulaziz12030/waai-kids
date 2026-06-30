"use client";

import { useMemo } from "react";
import MatnTextDisplay, { MatnVerse } from "../../components/MatnTextDisplay";
import FocusedMemorizationSegment from "./FocusedMemorizationSegment";
import {
  fallbackMatnVerses,
  MatnViewMode,
  PlanGroup,
  QuranSegment,
  ReligiousContent
} from "./matn-types";

type Props = {
  group: PlanGroup;
  segment: QuranSegment | null;
  content: ReligiousContent | null;
  mode: MatnViewMode;
  selectedChapterId: string;
  recordingSegmentId: string;
  busyId: string;
  today: string;
  focusRef: React.RefObject<HTMLDivElement | null>;
  onModeChange: (mode: MatnViewMode) => void;
  onChapterChange: (chapterId: string) => void;
  onRecordingChange: (segmentId: string, isRecording: boolean) => void;
  onUploaded: () => void | Promise<void>;
  onMarkMemorized: (segmentId: string) => void | Promise<void>;
  onSelectCurrent: () => void;
};

export default function MatnProgramReader({
  group,
  segment,
  content,
  mode,
  selectedChapterId,
  recordingSegmentId,
  busyId,
  today,
  focusRef,
  onModeChange,
  onChapterChange,
  onRecordingChange,
  onUploaded,
  onMarkMemorized,
  onSelectCurrent
}: Props) {
  const chapter = content?.chapters.find((item) => item.id === selectedChapterId)
    || content?.chapters[0]
    || null;

  const currentVerses = useMemo<MatnVerse[]>(() => {
    if (!segment) return [];
    if (content && segment.catalog_unit_from && segment.catalog_unit_to) {
      const verses = content.chapters
        .flatMap((item) => item.units)
        .filter((unit) => unit.unit_number >= segment.catalog_unit_from! && unit.unit_number <= segment.catalog_unit_to!);
      if (verses.length) return verses;
    }
    return fallbackMatnVerses(segment);
  }, [content, segment]);

  return (
    <>
      <div className="matn-view-filter" role="group" aria-label="طريقة عرض المنظومة">
        <button type="button" className={mode === "current" ? "active" : ""} onClick={() => onModeChange("current")}>🎯 مقطع الحفظ</button>
        <button type="button" className={mode === "chapter" ? "active" : ""} onClick={() => onModeChange("chapter")}>📑 قسم على حدة</button>
        <button type="button" className={mode === "full" ? "active" : ""} onClick={() => onModeChange("full")}>📜 القصيدة كاملة</button>
      </div>

      {mode === "current" && segment && (
        <FocusedMemorizationSegment
          group={group}
          segment={segment}
          verses={currentVerses}
          recordingSegmentId={recordingSegmentId}
          busyId={busyId}
          today={today}
          focusRef={focusRef}
          onRecordingChange={onRecordingChange}
          onUploaded={onUploaded}
          onMarkMemorized={onMarkMemorized}
          onSelectCurrent={onSelectCurrent}
        />
      )}

      {mode === "chapter" && content && chapter && (
        <section className="matn-library-view">
          <div className="matn-library-toolbar">
            <div><span className="section-label">عرض قسم واحد</span><h2>{chapter.title}</h2></div>
            <label>
              اختر القسم
              <select value={chapter.id} onChange={(event) => onChapterChange(event.target.value)}>
                {content.chapters.map((item) => (
                  <option key={item.id} value={item.id}>{item.chapter_number}. {item.title}</option>
                ))}
              </select>
            </label>
          </div>
          <MatnTextDisplay verses={chapter.units} title={chapter.title} />
        </section>
      )}

      {mode === "full" && content && (
        <section className="matn-library-view full-poem-view">
          <div className="matn-library-toolbar">
            <div><span className="section-label">النص الكامل</span><h2>{content.short_title}</h2><p>{content.author}</p></div>
            <b>{content.chapters.reduce((total, item) => total + item.units.length, 0)} بيتًا</b>
          </div>
          <div className="matn-full-chapters">
            {content.chapters.map((item) => (
              <MatnTextDisplay key={item.id} verses={item.units} title={`${item.chapter_number}. ${item.title}`} />
            ))}
          </div>
          {content.source_note && <p className="matn-source-note">{content.source_note}</p>}
        </section>
      )}
    </>
  );
}
