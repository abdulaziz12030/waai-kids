"use client";

import FocusedMemorizationSegment from "./FocusedMemorizationSegment";
import MatnProgramReader from "./MatnProgramReader";
import {
  formatDate,
  MatnViewMode,
  PlanGroup,
  QuranSegment,
  ReligiousContent,
  statusLabels,
} from "./matn-types";

type Props = {
  group: PlanGroup;
  index: number;
  isOpen: boolean;
  standalone?: boolean;
  activeSegment: QuranSegment | null;
  segmentTextLoading?: boolean;
  content: ReligiousContent | null;
  matnMode: MatnViewMode;
  selectedChapterId: string;
  recordingSegmentId: string;
  busyId: string;
  today: string;
  focusRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onSelectSegment: (segmentId: string) => void;
  onMatnModeChange: (mode: MatnViewMode) => void;
  onChapterChange: (chapterId: string) => void;
  onRecordingChange: (segmentId: string, isRecording: boolean) => void;
  onUploaded: () => void | Promise<void>;
  onMarkMemorized: (segmentId: string) => void | Promise<void>;
};

export default function MemorizationProgramCard(props: Props) {
  const { group, activeSegment, today } = props;
  const isMatn = group.plan.content_kind === "matn";
  const selected =
    activeSegment?.plan_id === group.plan.id ? activeSegment : group.current;
  const upcoming = group.segments.filter(
    (item) =>
      ["assigned", "needs_revision"].includes(item.status) &&
      item.id !== selected?.id,
  );
  const waiting = group.segments.filter(
    (item) =>
      ["memorized", "recited"].includes(item.status) &&
      item.id !== selected?.id,
  );
  const mastered = group.segments
    .filter((item) => item.status === "mastered" && item.id !== selected?.id)
    .reverse();
  const isOpen = Boolean(props.standalone || props.isOpen);

  function compactSegment(segment: QuranSegment, actionLabel: string) {
    const isSelected = segment.id === selected?.id;
    const isPast = Boolean(
      segment.scheduled_date && segment.scheduled_date < today,
    );
    return (
      <article
        className={`child-quran-queue-item ${isSelected ? "is-selected" : ""}`}
        key={segment.id}
      >
        <div className="queue-day-badge">
          <strong>
            {segment.day_number ? `المقطع ${segment.day_number}` : "مقطع"}
          </strong>
          <small>
            {segment.scheduled_date === today
              ? "اليوم"
              : isPast
                ? "مستحق"
                : formatDate(segment.scheduled_date)}
          </small>
        </div>
        <div className="queue-segment-copy">
          <span className={`task-status task-status-${segment.status}`}>
            {statusLabels[segment.status] || segment.status}
          </span>
          <h3>{segment.portion_label || "مقطع حفظ"}</h3>
          <p>
            {segment.achievement_points} ⭐
            {segment.reward_points > 0 ? ` · ${segment.reward_points} 💎` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={Boolean(props.recordingSegmentId) || isSelected}
          onClick={() => props.onSelectSegment(segment.id)}
        >
          {isSelected ? "المقطع مفتوح" : actionLabel}
        </button>
      </article>
    );
  }

  const headerContent = (
    <>
      <span className="program-number">{props.index + 1}</span>
      <span className="program-main-copy">
        <small>
          {isMatn
            ? group.plan.subject_category || "العلوم الدينية"
            : "برنامج حفظ القرآن"}
        </small>
        <strong>{group.plan.title}</strong>
        <span>
          {group.plan.daily_target} {isMatn ? "أبيات في المقطع" : "آيات يوميًا"}
          {group.plan.duration_days
            ? ` · ${group.plan.duration_days} يومًا`
            : ""}
          {group.plan.due_date
            ? ` · النهاية ${formatDate(group.plan.due_date)}`
            : ""}
        </span>
      </span>
      <span className="program-progress-copy">
        <b>{group.progress}%</b>
        <i>
          <em style={{ width: `${group.progress}%` }} />
        </i>
        <small>
          {group.masteredCount} من {group.segments.length} متقن
        </small>
      </span>
      <span className="program-counters">
        <b>
          <strong>{group.assignedCount}</strong>
          <small>قادم</small>
        </b>
        <b>
          <strong>{group.waitingCount}</strong>
          <small>مراجعة</small>
        </b>
      </span>
      {!props.standalone && <span className="program-chevron">⌄</span>}
    </>
  );

  return (
    <article
      className={`child-quran-program-card ${isOpen ? "is-open" : ""} ${props.standalone ? "is-standalone" : ""}`}
    >
      {props.standalone ? (
        <div className="child-quran-program-toggle child-quran-program-static">
          {headerContent}
        </div>
      ) : (
        <button
          className="child-quran-program-toggle"
          type="button"
          aria-expanded={isOpen}
          disabled={Boolean(props.recordingSegmentId) && !isOpen}
          onClick={props.onToggle}
        >
          {headerContent}
        </button>
      )}

      {isOpen && (
        <div className="child-quran-program-body">
          {group.segments.length === 0 ? (
            <div className="child-friendly-empty compact-empty">
              <span>🌤️</span>
              <strong>لا توجد مقاطع في هذا البرنامج</strong>
            </div>
          ) : (
            <>
              {isMatn ? (
                <MatnProgramReader
                  group={group}
                  segment={selected}
                  content={props.content}
                  mode={props.matnMode}
                  selectedChapterId={props.selectedChapterId}
                  recordingSegmentId={props.recordingSegmentId}
                  busyId={props.busyId}
                  today={today}
                  focusRef={props.focusRef}
                  onModeChange={props.onMatnModeChange}
                  onChapterChange={props.onChapterChange}
                  onRecordingChange={props.onRecordingChange}
                  onUploaded={props.onUploaded}
                  onMarkMemorized={props.onMarkMemorized}
                  onSelectCurrent={() =>
                    group.current && props.onSelectSegment(group.current.id)
                  }
                />
              ) : (
                selected && (
                  <FocusedMemorizationSegment
                    group={group}
                    segment={selected}
                    verses={[]}
                    textLoading={Boolean(props.segmentTextLoading)}
                    recordingSegmentId={props.recordingSegmentId}
                    busyId={props.busyId}
                    today={today}
                    focusRef={props.focusRef}
                    onRecordingChange={props.onRecordingChange}
                    onUploaded={props.onUploaded}
                    onMarkMemorized={props.onMarkMemorized}
                    onSelectCurrent={() =>
                      group.current && props.onSelectSegment(group.current.id)
                    }
                  />
                )
              )}

              <div className="child-quran-queues program-segment-queues">
                <details className="child-quran-queue-fold">
                  <summary>
                    <div>
                      <span className="queue-summary-icon">🗓️</span>
                      <div>
                        <strong>المقاطع الحالية والقادمة</strong>
                        <small>اختر أي مقطع لفتحه.</small>
                      </div>
                    </div>
                    <b>{upcoming.length}</b>
                  </summary>
                  <div className="child-quran-queue-body">
                    {upcoming.length ? (
                      upcoming.map((item) =>
                        compactSegment(
                          item,
                          item.scheduled_date && item.scheduled_date > today
                            ? "فتح والبدء مبكرًا"
                            : "فتح المقطع",
                        ),
                      )
                    ) : (
                      <p className="queue-empty-message">
                        لا توجد مقاطع أخرى حاليًا.
                      </p>
                    )}
                  </div>
                </details>
                {waiting.length > 0 && (
                  <details className="child-quran-queue-fold waiting-fold">
                    <summary>
                      <div>
                        <span className="queue-summary-icon">⏳</span>
                        <div>
                          <strong>بانتظار المراجعة</strong>
                        </div>
                      </div>
                      <b>{waiting.length}</b>
                    </summary>
                    <div className="child-quran-queue-body">
                      {waiting.map((item) =>
                        compactSegment(item, "عرض المقطع"),
                      )}
                    </div>
                  </details>
                )}
                {mastered.length > 0 && (
                  <details className="child-quran-queue-fold mastered-fold">
                    <summary>
                      <div>
                        <span className="queue-summary-icon">🏆</span>
                        <div>
                          <strong>المقاطع المتقنة</strong>
                        </div>
                      </div>
                      <b>{mastered.length}</b>
                    </summary>
                    <div className="child-quran-queue-body">
                      {mastered.map((item) =>
                        compactSegment(item, "عرض الإنجاز"),
                      )}
                    </div>
                  </details>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
