"use client";

import QuranAudioRecorder from "../../components/QuranAudioRecorder";
import QuranTextDisplay from "../../components/QuranTextDisplay";
import MatnTextDisplay, { MatnVerse } from "../../components/MatnTextDisplay";
import { formatDate, PlanGroup, QuranSegment, statusLabels } from "./matn-types";

type Props = {
  group: PlanGroup;
  segment: QuranSegment;
  verses: MatnVerse[];
  textLoading?: boolean;
  recordingSegmentId: string;
  busyId: string;
  onRecordingChange: (segmentId: string, isRecording: boolean) => void;
  onUploaded: () => void | Promise<void>;
  onMarkMemorized: (segmentId: string) => void | Promise<void>;
  onSelectCurrent: () => void;
  today: string;
  focusRef: React.RefObject<HTMLDivElement | null>;
};

export default function FocusedMemorizationSegment({
  group,
  segment,
  verses,
  textLoading = false,
  recordingSegmentId,
  busyId,
  onRecordingChange,
  onUploaded,
  onMarkMemorized,
  onSelectCurrent,
  today,
  focusRef
}: Props) {
  const isMatn = group.plan.content_kind === "matn";
  const recording = recordingSegmentId === segment.id;
  const actionable = ["assigned", "needs_revision", "memorized"].includes(segment.status);
  const early = Boolean(
    group.current
    && segment.id !== group.current.id
    && segment.scheduled_date
    && segment.scheduled_date > today
  );

  return (
    <div className="child-quran-plan-focus" ref={focusRef}>
      <div className="current-segment-heading">
        <div>
          <span className="section-label">
            {early ? "اخترته مبكرًا" : segment.status === "needs_revision" ? "مقطع المراجعة" : "المقطع المفتوح"}
          </span>
          <h2>{segment.portion_label || "مقطع الحفظ"}</h2>
          <p>{group.plan.title} · {formatDate(segment.scheduled_date)}</p>
        </div>
        <div className="current-segment-heading-actions">
          <span className={`task-status task-status-${segment.status}`}>{statusLabels[segment.status] || segment.status}</span>
          {group.current && segment.id !== group.current.id && (
            <button type="button" disabled={Boolean(recordingSegmentId)} onClick={onSelectCurrent}>
              العودة للمقطع الحالي
            </button>
          )}
        </div>
      </div>

      <div className="child-quran-steps" aria-label="خطوات التسميع">
        <div className="active"><b>1</b><span>اقرأ واحفظ</span></div>
        <div><b>2</b><span>ابدأ التسجيل</span></div>
        <div><b>3</b><span>استمع وأرسل</span></div>
      </div>

      <article className={`child-quran-segment child-quran-focus-card status-${segment.status} ${recording ? "is-reciting" : ""}`}>
        <div className="focus-segment-meta">
          <span>📅 {formatDate(segment.scheduled_date)}</span>
          <span>⭐ {segment.achievement_points} نقطة</span>
          {isMatn && segment.catalog_unit_from && segment.catalog_unit_to && (
            <span>📜 {segment.catalog_unit_to - segment.catalog_unit_from + 1} أبيات</span>
          )}
          {segment.reward_points > 0 && <span>💎 {segment.reward_points} مكافأة</span>}
        </div>

        {recording ? (
          <div className="child-quran-recitation-cover" role="status" aria-live="polite">
            <span>🙈</span>
            <strong>تم إخفاء النص أثناء التسميع</strong>
            <p>سمّع المقطع عن ظهر قلب، وسيعود النص فور إيقاف التسجيل.</p>
          </div>
        ) : isMatn ? (
          <MatnTextDisplay verses={verses} title={segment.chapter_title || undefined} />
        ) : (
          <QuranTextDisplay
            uthmaniText={segment.uthmani_text}
            readableText={segment.readable_text}
            loading={textLoading}
          />
        )}

        {segment.notes && (
          <div className="task-note review"><strong>تعليمات الحفظ</strong><p>{segment.notes}</p></div>
        )}

        {actionable && (
          <QuranAudioRecorder
            key={segment.id}
            segmentId={segment.id}
            hasAudio={Boolean(segment.has_audio)}
            audioDurationSeconds={segment.audio_duration_seconds}
            onUploaded={onUploaded}
            onRecordingChange={(value) => onRecordingChange(segment.id, value)}
          />
        )}

        {["assigned", "needs_revision"].includes(segment.status)
          && !(segment.status === "needs_revision" && segment.has_audio) && (
          <button
            className="child-quran-submit secondary-submit"
            type="button"
            disabled={busyId === segment.id || recording}
            onClick={() => onMarkMemorized(segment.id)}
          >
            {busyId === segment.id ? "جارٍ الإرسال..." : "تم الحفظ — إرسال بدون تسجيل"}
          </button>
        )}

        {segment.status === "memorized" && (
          <div className="child-goal-note">⏳ تم إرسال المقطع وينتظر المراجعة{segment.has_audio ? "، والتسجيل الصوتي مرفق." : "."}</div>
        )}
        {segment.status === "recited" && <div className="child-goal-note">👨‍🏫 تم التسميع والمقطع قيد الاعتماد النهائي.</div>}
        {segment.status === "mastered" && <div className="child-goal-note success">🎉 مقطع متقن وتمت إضافة نقاطه.</div>}
      </article>
    </div>
  );
}
