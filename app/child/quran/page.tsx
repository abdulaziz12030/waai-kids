"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import QuranTextDisplay from "../../components/QuranTextDisplay";
import QuranAudioRecorder from "../../components/QuranAudioRecorder";

type QuranPlan = {
  id: string;
  title: string;
  status: string;
  daily_target: number;
  start_date: string | null;
  due_date: string | null;
  surah_number: number | null;
  duration_days: number | null;
};

type QuranSegment = {
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
  has_audio: boolean;
  audio_submitted_at: string | null;
  audio_duration_seconds: number | null;
};

type QuranData = {
  plans: QuranPlan[];
  segments: QuranSegment[];
};

type PlanGroup = {
  plan: QuranPlan;
  segments: QuranSegment[];
  current: QuranSegment | null;
  assignedCount: number;
  waitingCount: number;
  masteredCount: number;
  progress: number;
};

const statusLabels: Record<string, string> = {
  assigned: "مطلوب حفظه",
  memorized: "أُرسل للتسميع",
  recited: "قيد الاعتماد",
  mastered: "متقن",
  needs_revision: "يحتاج مراجعة"
};

function localToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return "دون تاريخ";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(`${dateValue}T00:00:00`));
}

function segmentSortValue(segment: QuranSegment) {
  const dateValue = segment.scheduled_date
    ? new Date(`${segment.scheduled_date}T00:00:00`).getTime()
    : Number.MAX_SAFE_INTEGER;
  return dateValue + Number(segment.day_number || 0);
}

function pickCurrentSegment(segments: QuranSegment[], today: string) {
  const sorted = [...segments].sort((a, b) => segmentSortValue(a) - segmentSortValue(b));
  return (
    sorted.find((segment) => segment.status === "needs_revision") ||
    sorted.find((segment) => segment.status === "assigned" && (!segment.scheduled_date || segment.scheduled_date <= today)) ||
    sorted.find((segment) => segment.status === "assigned") ||
    sorted.find((segment) => ["memorized", "recited"].includes(segment.status)) ||
    sorted.find((segment) => segment.status === "mastered") ||
    null
  );
}

export default function ChildQuranPage() {
  const router = useRouter();
  const focusRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [data, setData] = useState<QuranData>({ plans: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [recordingSegmentId, setRecordingSegmentId] = useState("");
  const [openPlanId, setOpenPlanId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) {
      router.replace("/child/login");
      return;
    }

    const result = await client.rpc("get_child_quran_dashboard", { p_session_token: token });
    if (result.error || !result.data) {
      localStorage.removeItem("namaa_child_token");
      router.replace("/child/login");
      return;
    }

    setData(result.data as QuranData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const today = localToday();

  const planGroups = useMemo<PlanGroup[]>(() => {
    return data.plans.map((plan) => {
      const segments = data.segments
        .filter((segment) => segment.plan_id === plan.id)
        .sort((a, b) => segmentSortValue(a) - segmentSortValue(b));
      const masteredCount = segments.filter((segment) => segment.status === "mastered").length;
      const assignedCount = segments.filter((segment) => ["assigned", "needs_revision"].includes(segment.status)).length;
      const waitingCount = segments.filter((segment) => ["memorized", "recited"].includes(segment.status)).length;
      const progress = segments.length > 0 ? Math.round((masteredCount / segments.length) * 100) : 0;

      return {
        plan,
        segments,
        current: pickCurrentSegment(segments, today),
        assignedCount,
        waitingCount,
        masteredCount,
        progress
      };
    });
  }, [data.plans, data.segments, today]);

  const recommendedGroup = useMemo(() => {
    return (
      planGroups.find((group) => group.current?.status === "needs_revision") ||
      planGroups.find((group) => group.current?.status === "assigned" && (!group.current.scheduled_date || group.current.scheduled_date <= today)) ||
      planGroups.find((group) => group.current) ||
      planGroups[0] ||
      null
    );
  }, [planGroups, today]);

  useEffect(() => {
    if (!initializedRef.current && recommendedGroup) {
      initializedRef.current = true;
      setOpenPlanId(recommendedGroup.plan.id);
      setSelectedSegmentId(recommendedGroup.current?.id || recommendedGroup.segments[0]?.id || "");
      return;
    }

    if (openPlanId && !planGroups.some((group) => group.plan.id === openPlanId)) {
      setOpenPlanId("");
      setSelectedSegmentId("");
    }
  }, [openPlanId, planGroups, recommendedGroup]);

  const activeGroup = planGroups.find((group) => group.plan.id === openPlanId) || null;
  const activeSegment = activeGroup
    ? activeGroup.segments.find((segment) => segment.id === selectedSegmentId) || activeGroup.current
    : null;

  const totalMastered = useMemo(
    () => data.segments.filter((segment) => segment.status === "mastered").length,
    [data.segments]
  );

  const totalPending = useMemo(
    () => data.segments.filter((segment) => ["assigned", "needs_revision"].includes(segment.status)).length,
    [data.segments]
  );

  async function markMemorized(segmentId: string) {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) return;

    setBusyId(segmentId);
    setError("");
    setSuccess("");
    const result = await client.rpc("child_mark_quran_memorized", {
      p_session_token: token,
      p_segment_id: segmentId
    });
    setBusyId("");

    if (result.error) {
      setError("تعذر إرسال المقطع للتسميع.");
      return;
    }

    setSuccess("أحسنت! تم إرسال المقطع للتسميع بدون تسجيل صوتي.");
    await loadData();
  }

  function handleRecordingChange(segmentId: string, isRecording: boolean) {
    setRecordingSegmentId((current) => {
      if (isRecording) return segmentId;
      return current === segmentId ? "" : current;
    });
  }

  function togglePlan(group: PlanGroup) {
    if (recordingSegmentId) return;

    if (openPlanId === group.plan.id) {
      setOpenPlanId("");
      return;
    }

    setOpenPlanId(group.plan.id);
    const selectedBelongsToPlan = group.segments.some((segment) => segment.id === selectedSegmentId);
    if (!selectedBelongsToPlan) setSelectedSegmentId(group.current?.id || group.segments[0]?.id || "");
    setError("");
    setSuccess("");
  }

  function selectSegment(planId: string, segmentId: string) {
    if (recordingSegmentId) return;
    setOpenPlanId(planId);
    setSelectedSegmentId(segmentId);
    setError("");
    setSuccess("");
    window.requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function renderCompactSegment(group: PlanGroup, segment: QuranSegment, actionLabel: string) {
    const isToday = segment.scheduled_date === today;
    const isPast = Boolean(segment.scheduled_date && segment.scheduled_date < today);
    const isSelected = segment.id === activeSegment?.id && group.plan.id === openPlanId;

    return (
      <article className={`child-quran-queue-item ${isSelected ? "is-selected" : ""}`} key={segment.id}>
        <div className="queue-day-badge">
          <strong>{segment.day_number ? `اليوم ${segment.day_number}` : "مقطع"}</strong>
          <small>{isToday ? "اليوم" : isPast ? "مستحق" : formatDate(segment.scheduled_date)}</small>
        </div>
        <div className="queue-segment-copy">
          <span className={`task-status task-status-${segment.status}`}>{statusLabels[segment.status] || segment.status}</span>
          <h3>{segment.portion_label || "مقطع قرآن"}</h3>
          <p>{segment.achievement_points} ⭐{segment.reward_points > 0 ? ` · ${segment.reward_points} 💎` : ""}</p>
        </div>
        <button
          type="button"
          disabled={Boolean(recordingSegmentId) || isSelected}
          onClick={() => selectSegment(group.plan.id, segment.id)}
        >
          {isSelected ? "المقطع مفتوح" : actionLabel}
        </button>
      </article>
    );
  }

  function renderFocusedSegment(group: PlanGroup, segment: QuranSegment) {
    const isRecordingActive = recordingSegmentId === segment.id;
    const isActionable = ["assigned", "needs_revision", "memorized"].includes(segment.status);
    const isEarlySelection = Boolean(
      group.current &&
      segment.id !== group.current.id &&
      segment.scheduled_date &&
      segment.scheduled_date > today
    );

    return (
      <div className="child-quran-plan-focus" ref={focusRef}>
        <div className="current-segment-heading">
          <div>
            <span className="section-label">
              {isEarlySelection ? "اخترته مبكرًا" : segment.status === "needs_revision" ? "مقطع المراجعة" : "المقطع المفتوح"}
            </span>
            <h2>{segment.portion_label || "مقطع القرآن"}</h2>
            <p>{group.plan.title} · {formatDate(segment.scheduled_date)}</p>
          </div>
          <div className="current-segment-heading-actions">
            <span className={`task-status task-status-${segment.status}`}>{statusLabels[segment.status] || segment.status}</span>
            {group.current && segment.id !== group.current.id && (
              <button type="button" disabled={Boolean(recordingSegmentId)} onClick={() => selectSegment(group.plan.id, group.current!.id)}>
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

        <article className={`child-quran-segment child-quran-focus-card status-${segment.status} ${isRecordingActive ? "is-reciting" : ""}`}>
          <div className="focus-segment-meta">
            <span>📅 {formatDate(segment.scheduled_date)}</span>
            <span>⭐ {segment.achievement_points} نقطة</span>
            {segment.reward_points > 0 && <span>💎 {segment.reward_points} مكافأة</span>}
          </div>

          {isRecordingActive ? (
            <div className="child-quran-recitation-cover" role="status" aria-live="polite">
              <span>🙈</span>
              <strong>تم إخفاء الآيات أثناء التسميع</strong>
              <p>سمّع المقطع عن ظهر قلب، وسيعود النص فور إيقاف التسجيل.</p>
            </div>
          ) : (
            <QuranTextDisplay uthmaniText={segment.uthmani_text} readableText={segment.readable_text} />
          )}

          {segment.notes && <div className="task-note review"><strong>تعليمات الحفظ</strong><p>{segment.notes}</p></div>}

          {isActionable && (
            <QuranAudioRecorder
              key={segment.id}
              segmentId={segment.id}
              hasAudio={Boolean(segment.has_audio)}
              audioDurationSeconds={segment.audio_duration_seconds}
              onUploaded={loadData}
              onRecordingChange={(isRecording) => handleRecordingChange(segment.id, isRecording)}
            />
          )}

          {["assigned", "needs_revision"].includes(segment.status) && !(segment.status === "needs_revision" && segment.has_audio) && (
            <button className="child-quran-submit secondary-submit" type="button" disabled={busyId === segment.id || isRecordingActive} onClick={() => markMemorized(segment.id)}>
              {busyId === segment.id ? "جارٍ الإرسال..." : "تم الحفظ — إرسال بدون تسجيل"}
            </button>
          )}
          {segment.status === "memorized" && <div className="child-goal-note">⏳ تم إرسال المقطع وينتظر المراجعة{segment.has_audio ? "، والتسجيل الصوتي مرفق." : "."}</div>}
          {segment.status === "recited" && <div className="child-goal-note">👨‍🏫 تم التسميع والمقطع قيد الاعتماد النهائي.</div>}
          {segment.status === "mastered" && <div className="child-goal-note success">🎉 مقطع متقن وتمت إضافة نقاطه.</div>}
        </article>
      </div>
    );
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز برنامج الحفظ...</main>;

  return (
    <main className="child-quran-page child-quran-focus-page">
      <header className="child-app-header child-quran-page-header">
        <div>
          <span className="section-label">📖 برامجي</span>
          <h1>الحفظ والتسميع</h1>
          <p>اختر برنامج الحفظ أولًا، ثم افتح مقطعًا واحدًا للحفظ أو التسميع دون تكدس الصفحة.</p>
        </div>
      </header>

      {error && <p className="form-message error-message floating-message">{error}</p>}
      {success && <p className="form-message success-message floating-message">{success}</p>}

      <section className="child-quran-hero child-quran-hero-focused">
        <div className="child-quran-hero-message">
          <span>🌙</span>
          <div><h2>{data.plans.length > 1 ? "برامجك مرتبة في مكان واحد" : "برنامجك جاهز"}</h2><p>افتح البرنامج الذي تريد متابعته، ثم انتقل بين مقاطعه بسهولة.</p></div>
        </div>
        <div className="child-quran-stats">
          <article><strong>{data.plans.length}</strong><small>برامج الحفظ</small></article>
          <article><strong>{totalPending}</strong><small>مقاطع حالية وقادمة</small></article>
          <article><strong>{totalMastered}</strong><small>مقاطع متقنة</small></article>
        </div>
      </section>

      {data.plans.length === 0 ? (
        <section className="child-friendly-empty child-quran-empty">
          <span>📘</span><strong>لا توجد خطة حفظ بعد</strong><p>سيضيف ولي الأمر أو المعلم خطة الحفظ والمقاطع المناسبة لك.</p>
        </section>
      ) : (
        <section className="child-quran-programs" aria-label="برامج الحفظ">
          <div className="child-programs-heading">
            <div><span className="section-label">التصفية حسب البرنامج</span><h2>اختر برنامج الحفظ</h2></div>
            <small>يُفتح برنامج واحد ومقطع واحد فقط في كل مرة.</small>
          </div>

          {planGroups.map((group, index) => {
            const isOpen = openPlanId === group.plan.id;
            const upcoming = group.segments.filter((segment) => ["assigned", "needs_revision"].includes(segment.status) && segment.id !== activeSegment?.id);
            const waiting = group.segments.filter((segment) => ["memorized", "recited"].includes(segment.status) && segment.id !== activeSegment?.id);
            const mastered = group.segments.filter((segment) => segment.status === "mastered" && segment.id !== activeSegment?.id).reverse();

            return (
              <article className={`child-quran-program-card ${isOpen ? "is-open" : ""}`} key={group.plan.id}>
                <button
                  className="child-quran-program-toggle"
                  type="button"
                  aria-expanded={isOpen}
                  disabled={Boolean(recordingSegmentId) && !isOpen}
                  onClick={() => togglePlan(group)}
                >
                  <span className="program-number">{index + 1}</span>
                  <span className="program-main-copy">
                    <small>برنامج حفظ</small>
                    <strong>{group.plan.title}</strong>
                    <span>{group.plan.daily_target} آيات يوميًا{group.plan.duration_days ? ` · ${group.plan.duration_days} يومًا` : ""}{group.plan.due_date ? ` · النهاية ${formatDate(group.plan.due_date)}` : ""}</span>
                  </span>
                  <span className="program-progress-copy">
                    <b>{group.progress}%</b>
                    <i><em style={{ width: `${group.progress}%` }} /></i>
                    <small>{group.masteredCount} من {group.segments.length} متقن</small>
                  </span>
                  <span className="program-counters">
                    <b><strong>{group.assignedCount}</strong><small>قادم</small></b>
                    <b><strong>{group.waitingCount}</strong><small>مراجعة</small></b>
                  </span>
                  <span className="program-chevron">⌄</span>
                </button>

                {isOpen && (
                  <div className="child-quran-program-body">
                    {group.segments.length === 0 ? (
                      <div className="child-friendly-empty compact-empty"><span>🌤️</span><strong>لا توجد مقاطع في هذا البرنامج</strong><p>ستظهر المقاطع هنا بعد إضافتها.</p></div>
                    ) : (
                      <>
                        {activeSegment && activeSegment.plan_id === group.plan.id && renderFocusedSegment(group, activeSegment)}

                        <div className="child-quran-queues program-segment-queues" aria-label={`مقاطع ${group.plan.title}`}>
                          <details className="child-quran-queue-fold">
                            <summary>
                              <div><span className="queue-summary-icon">🗓️</span><div><strong>المقاطع الحالية والقادمة</strong><small>اختر أي مقطع ليفتح مكان المقطع الحالي.</small></div></div>
                              <b>{upcoming.length}</b>
                            </summary>
                            <div className="child-quran-queue-body">
                              {upcoming.length === 0 ? <p className="queue-empty-message">لا توجد مقاطع أخرى حاليًا.</p> : upcoming.map((segment) => renderCompactSegment(group, segment, segment.scheduled_date && segment.scheduled_date > today ? "فتح والبدء مبكرًا" : "فتح المقطع"))}
                            </div>
                          </details>

                          {waiting.length > 0 && (
                            <details className="child-quran-queue-fold waiting-fold">
                              <summary>
                                <div><span className="queue-summary-icon">⏳</span><div><strong>بانتظار المراجعة</strong><small>المقاطع المرسلة في هذا البرنامج فقط.</small></div></div>
                                <b>{waiting.length}</b>
                              </summary>
                              <div className="child-quran-queue-body">{waiting.map((segment) => renderCompactSegment(group, segment, "عرض المقطع"))}</div>
                            </details>
                          )}

                          {mastered.length > 0 && (
                            <details className="child-quran-queue-fold mastered-fold">
                              <summary>
                                <div><span className="queue-summary-icon">🏆</span><div><strong>المقاطع المتقنة</strong><small>إنجازات هذا البرنامج محفوظة هنا.</small></div></div>
                                <b>{mastered.length}</b>
                              </summary>
                              <div className="child-quran-queue-body">{mastered.map((segment) => renderCompactSegment(group, segment, "عرض الإنجاز"))}</div>
                            </details>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
