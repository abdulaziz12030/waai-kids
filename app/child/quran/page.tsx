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
  const dateValue = segment.scheduled_date ? new Date(`${segment.scheduled_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  return dateValue + Number(segment.day_number || 0);
}

export default function ChildQuranPage() {
  const router = useRouter();
  const focusRef = useRef<HTMLElement | null>(null);
  const [data, setData] = useState<QuranData>({ plans: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [recordingSegmentId, setRecordingSegmentId] = useState("");
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

  const sortedSegments = useMemo(
    () => [...data.segments].sort((a, b) => segmentSortValue(a) - segmentSortValue(b)),
    [data.segments]
  );

  const defaultSegment = useMemo(() => {
    const revision = sortedSegments.find((segment) => segment.status === "needs_revision");
    if (revision) return revision;

    const dueNow = sortedSegments.find((segment) =>
      segment.status === "assigned" && (!segment.scheduled_date || segment.scheduled_date <= today)
    );
    if (dueNow) return dueNow;

    const nextAssigned = sortedSegments.find((segment) => segment.status === "assigned");
    if (nextAssigned) return nextAssigned;

    const waiting = sortedSegments.find((segment) => ["memorized", "recited"].includes(segment.status));
    if (waiting) return waiting;

    return sortedSegments.find((segment) => segment.status === "mastered") || null;
  }, [sortedSegments, today]);

  useEffect(() => {
    if (selectedSegmentId && data.segments.some((segment) => segment.id === selectedSegmentId)) return;
    setSelectedSegmentId(defaultSegment?.id || "");
  }, [defaultSegment?.id, data.segments, selectedSegmentId]);

  const activeSegment = data.segments.find((segment) => segment.id === selectedSegmentId) || defaultSegment;
  const isEarlySelection = Boolean(
    activeSegment &&
    defaultSegment &&
    activeSegment.id !== defaultSegment.id &&
    activeSegment.scheduled_date &&
    activeSegment.scheduled_date > today
  );

  const upcomingSegments = useMemo(
    () => sortedSegments.filter((segment) =>
      ["assigned", "needs_revision"].includes(segment.status) && segment.id !== activeSegment?.id
    ),
    [sortedSegments, activeSegment?.id]
  );

  const waitingSegments = useMemo(
    () => sortedSegments.filter((segment) =>
      ["memorized", "recited"].includes(segment.status) && segment.id !== activeSegment?.id
    ),
    [sortedSegments, activeSegment?.id]
  );

  const masteredSegments = useMemo(
    () => sortedSegments.filter((segment) => segment.status === "mastered" && segment.id !== activeSegment?.id).reverse(),
    [sortedSegments, activeSegment?.id]
  );

  const masteredCount = useMemo(
    () => data.segments.filter((segment) => segment.status === "mastered").length,
    [data.segments]
  );

  const planById = useMemo(
    () => Object.fromEntries(data.plans.map((plan) => [plan.id, plan])),
    [data.plans]
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

  function selectSegment(segmentId: string) {
    if (recordingSegmentId) return;
    setSelectedSegmentId(segmentId);
    setError("");
    setSuccess("");
    window.requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function renderCompactSegment(segment: QuranSegment, actionLabel = "اختيار هذا المقطع") {
    const plan = planById[segment.plan_id];
    const isToday = segment.scheduled_date === today;
    const isPast = Boolean(segment.scheduled_date && segment.scheduled_date < today);

    return (
      <article className="child-quran-queue-item" key={segment.id}>
        <div className="queue-day-badge">
          <strong>{segment.day_number ? `اليوم ${segment.day_number}` : "مقطع"}</strong>
          <small>{isToday ? "اليوم" : isPast ? "مستحق" : formatDate(segment.scheduled_date)}</small>
        </div>
        <div className="queue-segment-copy">
          <span className={`task-status task-status-${segment.status}`}>{statusLabels[segment.status] || segment.status}</span>
          <h3>{segment.portion_label || "مقطع قرآن"}</h3>
          <p>{plan?.title || "خطة الحفظ"} · {segment.achievement_points} ⭐{segment.reward_points > 0 ? ` · ${segment.reward_points} 💎` : ""}</p>
        </div>
        <button
          type="button"
          disabled={Boolean(recordingSegmentId)}
          onClick={() => selectSegment(segment.id)}
        >
          {actionLabel}
        </button>
      </article>
    );
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز برنامج الحفظ...</main>;

  const isRecordingActive = Boolean(activeSegment && recordingSegmentId === activeSegment.id);
  const activePlan = activeSegment ? planById[activeSegment.plan_id] : null;
  const activeIsActionable = Boolean(activeSegment && ["assigned", "needs_revision", "memorized"].includes(activeSegment.status));

  return (
    <main className="child-quran-page child-quran-focus-page">
      <header className="child-app-header child-quran-page-header">
        <div><span className="section-label">📖 برنامجي</span><h1>الحفظ والتسميع</h1><p>ركّز على مقطع واحد، ثم انتقل للمقطع التالي عندما تكون مستعدًا.</p></div>
      </header>

      {error && <p className="form-message error-message floating-message">{error}</p>}
      {success && <p className="form-message success-message floating-message">{success}</p>}

      <section className="child-quran-hero child-quran-hero-focused">
        <div className="child-quran-hero-message"><span>🌙</span><div><h2>{activeSegment ? "مقطعك جاهز" : "خطوة صغيرة كل يوم"}</h2><p>{activeSegment ? "اقرأ المقطع واحفظه، ثم سجّل تسميعك عندما تصبح مستعدًا." : "سيظهر مقطعك هنا فور إضافته إلى الخطة."}</p></div></div>
        <div className="child-quran-stats">
          <article><strong>{activeSegment ? 1 : 0}</strong><small>المقطع المختار</small></article>
          <article><strong>{upcomingSegments.length}</strong><small>مقاطع قادمة</small></article>
          <article><strong>{masteredCount}</strong><small>مقاطع متقنة</small></article>
        </div>
      </section>

      {data.plans.length === 0 ? (
        <section className="child-friendly-empty child-quran-empty">
          <span>📘</span><strong>لا توجد خطة حفظ بعد</strong><p>سيضيف ولي الأمر أو المعلم خطة الحفظ والمقاطع المناسبة لك.</p>
        </section>
      ) : data.segments.length === 0 ? (
        <section className="child-friendly-empty child-quran-empty">
          <span>🌤️</span><strong>لا توجد مقاطع بعد</strong><p>سيظهر أول مقطع هنا عند إضافته إلى خطة الحفظ.</p>
        </section>
      ) : (
        <>
          <details className="child-quran-plan-fold">
            <summary>
              <div><span>📚</span><div><strong>{data.plans.length === 1 ? data.plans[0].title : `${data.plans.length} خطط حفظ`}</strong><small>عرض معلومات الخطة</small></div></div>
              <span className="fold-chevron">⌄</span>
            </summary>
            <div className="child-quran-plan-fold-body">
              {data.plans.map((plan) => (
                <article key={plan.id}><span>📘</span><div><strong>{plan.title}</strong><small>{plan.daily_target} آيات يوميًا{plan.duration_days ? ` · ${plan.duration_days} يومًا` : ""}{plan.due_date ? ` · النهاية ${formatDate(plan.due_date)}` : ""}</small></div></article>
              ))}
            </div>
          </details>

          {activeSegment && (
            <section className="child-quran-current-section" ref={focusRef}>
              <div className="current-segment-heading">
                <div>
                  <span className="section-label">{isEarlySelection ? "اخترته مبكرًا" : activeSegment.status === "needs_revision" ? "مقطع المراجعة" : "المقطع الحالي"}</span>
                  <h2>{activeSegment.portion_label || "مقطع القرآن"}</h2>
                  <p>{activePlan?.title || "خطة الحفظ"} · {formatDate(activeSegment.scheduled_date)}</p>
                </div>
                <div className="current-segment-heading-actions">
                  <span className={`task-status task-status-${activeSegment.status}`}>{statusLabels[activeSegment.status] || activeSegment.status}</span>
                  {defaultSegment && activeSegment.id !== defaultSegment.id && (
                    <button type="button" disabled={Boolean(recordingSegmentId)} onClick={() => selectSegment(defaultSegment.id)}>العودة للمقطع الأساسي</button>
                  )}
                </div>
              </div>

              <div className="child-quran-steps" aria-label="خطوات التسميع">
                <div className="active"><b>1</b><span>اقرأ واحفظ</span></div>
                <div><b>2</b><span>ابدأ التسجيل</span></div>
                <div><b>3</b><span>استمع وأرسل</span></div>
              </div>

              <article className={`child-quran-segment child-quran-focus-card status-${activeSegment.status} ${isRecordingActive ? "is-reciting" : ""}`}>
                <div className="focus-segment-meta">
                  <span>📅 {formatDate(activeSegment.scheduled_date)}</span>
                  <span>⭐ {activeSegment.achievement_points} نقطة</span>
                  {activeSegment.reward_points > 0 && <span>💎 {activeSegment.reward_points} مكافأة</span>}
                </div>

                {isRecordingActive ? (
                  <div className="child-quran-recitation-cover" role="status" aria-live="polite">
                    <span>🙈</span>
                    <strong>تم إخفاء الآيات أثناء التسميع</strong>
                    <p>سمّع المقطع عن ظهر قلب، وسيعود النص فور إيقاف التسجيل.</p>
                  </div>
                ) : (
                  <QuranTextDisplay uthmaniText={activeSegment.uthmani_text} readableText={activeSegment.readable_text} />
                )}

                {activeSegment.notes && <div className="task-note review"><strong>تعليمات الحفظ</strong><p>{activeSegment.notes}</p></div>}

                {activeIsActionable && (
                  <QuranAudioRecorder
                    key={activeSegment.id}
                    segmentId={activeSegment.id}
                    hasAudio={Boolean(activeSegment.has_audio)}
                    audioDurationSeconds={activeSegment.audio_duration_seconds}
                    onUploaded={loadData}
                    onRecordingChange={(isRecording) => handleRecordingChange(activeSegment.id, isRecording)}
                  />
                )}

                {["assigned", "needs_revision"].includes(activeSegment.status) && !(activeSegment.status === "needs_revision" && activeSegment.has_audio) && (
                  <button className="child-quran-submit secondary-submit" type="button" disabled={busyId === activeSegment.id || isRecordingActive} onClick={() => markMemorized(activeSegment.id)}>{busyId === activeSegment.id ? "جارٍ الإرسال..." : "تم الحفظ — إرسال بدون تسجيل"}</button>
                )}
                {activeSegment.status === "memorized" && <div className="child-goal-note">⏳ تم إرسال المقطع وينتظر المراجعة{activeSegment.has_audio ? "، والتسجيل الصوتي مرفق." : "."}</div>}
                {activeSegment.status === "recited" && <div className="child-goal-note">👨‍🏫 تم التسميع والمقطع قيد الاعتماد النهائي.</div>}
                {activeSegment.status === "mastered" && <div className="child-goal-note success">🎉 مقطع متقن وتمت إضافة نقاطه.</div>}
              </article>
            </section>
          )}

          <section className="child-quran-queues" aria-label="مقاطع الحفظ الأخرى">
            <details className="child-quran-queue-fold">
              <summary>
                <div><span className="queue-summary-icon">🗓️</span><div><strong>المقاطع القادمة</strong><small>مطوية لتبقى الصفحة مرتبة، ويمكنك اختيار أي مقطع والبدء به.</small></div></div>
                <b>{upcomingSegments.length}</b>
              </summary>
              <div className="child-quran-queue-body">
                {upcomingSegments.length === 0 ? <p className="queue-empty-message">لا توجد مقاطع قادمة حاليًا.</p> : upcomingSegments.map((segment) => renderCompactSegment(segment, segment.scheduled_date && segment.scheduled_date > today ? "اختيار والبدء مبكرًا" : "اختيار هذا المقطع"))}
              </div>
            </details>

            {waitingSegments.length > 0 && (
              <details className="child-quran-queue-fold waiting-fold">
                <summary>
                  <div><span className="queue-summary-icon">⏳</span><div><strong>بانتظار المراجعة</strong><small>مقاطع أرسلتها وتنتظر اعتماد ولي الأمر أو المعلم.</small></div></div>
                  <b>{waitingSegments.length}</b>
                </summary>
                <div className="child-quran-queue-body">{waitingSegments.map((segment) => renderCompactSegment(segment, "عرض المقطع"))}</div>
              </details>
            )}

            {masteredSegments.length > 0 && (
              <details className="child-quran-queue-fold mastered-fold">
                <summary>
                  <div><span className="queue-summary-icon">🏆</span><div><strong>سجل المقاطع المتقنة</strong><small>إنجازاتك السابقة محفوظة هنا دون ازدحام الصفحة.</small></div></div>
                  <b>{masteredSegments.length}</b>
                </summary>
                <div className="child-quran-queue-body">{masteredSegments.map((segment) => renderCompactSegment(segment, "عرض الإنجاز"))}</div>
              </details>
            )}
          </section>
        </>
      )}
    </main>
  );
}
