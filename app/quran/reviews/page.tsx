"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import QuranTextDisplay from "../../components/QuranTextDisplay";

type ReviewMode =
  | "teacher"
  | "parent_supervision_pending"
  | "parent_supervision_revision"
  | "parent_supervision_completed"
  | "parent_supervision";

type ReviewItem = {
  segment_id: string;
  student_id: string;
  student_name: string;
  plan_title: string;
  portion_label: string;
  uthmani_text: string | null;
  readable_text: string | null;
  status: string;
  scheduled_date: string | null;
  day_number: number | null;
  achievement_points: number;
  notes: string | null;
  memorized_at: string | null;
  mastered_at: string | null;
  has_audio: boolean;
  audio_duration_seconds: number | null;
  review_mode: ReviewMode;
  latest_mistakes_count: number | null;
  latest_fluency_score: number | null;
  latest_tajweed_score: number | null;
  latest_review_notes: string | null;
  latest_reviewer_type: string | null;
  latest_reviewed_at: string | null;
};

type ReviewDraft = {
  mistakes: string;
  fluency: string;
  tajweed: string;
  notes: string;
};

const statusLabels: Record<string, string> = {
  memorized: "بانتظار تقييم المعلم",
  recited: "بانتظار القرار النهائي",
  mastered: "متقن ومعتمد",
  needs_revision: "أعيد للتصحيح"
};

function formatSeconds(value: number | null) {
  if (!value) return "";
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function initialDraft(item: ReviewItem): ReviewDraft {
  return {
    mistakes: String(item.latest_mistakes_count ?? 0),
    fluency: item.latest_fluency_score === null ? "" : String(item.latest_fluency_score),
    tajweed: item.latest_tajweed_score === null ? "" : String(item.latest_tajweed_score),
    notes: item.latest_review_notes || ""
  };
}

export default function QuranReviewsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [portalType, setPortalType] = useState<"family" | "teacher" | "new">("new");
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [audioBusyId, setAudioBusyId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadQueue() {
    const client = supabase;
    if (!client) return;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }

    const [typeResult, queueResult] = await Promise.all([
      client.rpc("get_my_portal_type"),
      client.rpc("get_quran_review_queue")
    ]);

    const type = (typeResult.data || "new") as "family" | "teacher" | "new";
    setPortalType(type);
    if (queueResult.error) setError(queueResult.error.message || "تعذر تحميل بيانات التسميع.");
    else setItems((queueResult.data || []) as ReviewItem[]);
    setLoading(false);
  }

  useEffect(() => { loadQueue(); }, []);

  const teacherItems = useMemo(() => items.filter((item) => item.review_mode === "teacher"), [items]);
  const pendingItems = useMemo(() => items.filter((item) => item.review_mode === "parent_supervision_pending"), [items]);
  const revisionItems = useMemo(() => items.filter((item) => item.review_mode === "parent_supervision_revision"), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.review_mode === "parent_supervision_completed"), [items]);

  function updateDraft(item: ReviewItem, field: keyof ReviewDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [item.segment_id]: {
        ...(current[item.segment_id] || initialDraft(item)),
        [field]: value
      }
    }));
  }

  async function loadAudio(item: ReviewItem) {
    const client = supabase;
    if (!client || !item.has_audio) return;
    setAudioBusyId(item.segment_id);
    setError("");
    const result = await client.functions.invoke("quran-audio", {
      body: { action: "reviewer-url", segment_id: item.segment_id }
    });
    setAudioBusyId("");
    if (result.error || !result.data?.signedUrl) {
      setError(result.data?.error || result.error?.message || "تعذر تشغيل تسجيل الطالب.");
      return;
    }
    setAudioUrls((current) => ({ ...current, [item.segment_id]: result.data.signedUrl }));
  }

  async function teacherDecision(item: ReviewItem, status: "mastered" | "needs_revision") {
    const client = supabase;
    if (!client || portalType !== "teacher") return;
    const draft = drafts[item.segment_id] || initialDraft(item);

    setBusyId(item.segment_id);
    setError("");
    setSuccess("");
    const result = await client.rpc("review_quran_segment_shared", {
      p_segment_id: item.segment_id,
      p_status: status,
      p_mistakes_count: Math.max(0, Number(draft.mistakes || 0)),
      p_fluency_score: draft.fluency ? Number(draft.fluency) : null,
      p_tajweed_score: draft.tajweed ? Number(draft.tajweed) : null,
      p_notes: draft.notes || null
    });
    setBusyId("");

    if (result.error) {
      setError(result.error.message || "تعذر حفظ تقييم المعلم.");
      return;
    }

    setSuccess(status === "mastered" ? "تم اعتماد إتقان المقطع وإضافة نقاط الإنجاز." : "تمت إعادة المقطع للطالب للتصحيح وإرسال محاولة جديدة.");
    await loadQueue();
  }

  function AudioPanel({ item }: { item: ReviewItem }) {
    const audioUrl = audioUrls[item.segment_id];
    return (
      <section className={`review-audio-panel ${item.has_audio ? "has-audio" : "no-audio"}`}>
        <div className="review-panel-heading"><span>{item.has_audio ? "🎧" : "🔇"}</span><div><h3>{item.has_audio ? "تسجيل الطالب الصوتي" : "أرسل الطالب المقطع دون تسجيل"}</h3><p>{item.has_audio ? `المدة ${formatSeconds(item.audio_duration_seconds)}. التسجيل متاح للمعلم وولي الأمر للمتابعة.` : "يمكن للمعلم إجراء التسميع المباشر."}</p></div></div>
        {item.has_audio && !audioUrl && <button className="load-review-audio" type="button" disabled={audioBusyId === item.segment_id} onClick={() => loadAudio(item)}>{audioBusyId === item.segment_id ? "جارٍ تجهيز التسجيل..." : "تشغيل تسجيل الطالب"}</button>}
        {item.has_audio && audioUrl && <audio className="review-audio-player" controls preload="metadata" src={audioUrl} />}
      </section>
    );
  }

  function ItemHeader({ item, badge }: { item: ReviewItem; badge: string }) {
    return (
      <div className="quran-review-card-head">
        <div>
          <div className="review-mode-row"><span className="quran-plan-status">{statusLabels[item.status] || item.status}</span><span className="review-mode-badge">{badge}</span></div>
          <h2>{item.student_name}</h2><p>{item.plan_title}</p><strong className="review-portion-label">{item.portion_label}</strong>
          {(item.day_number || item.scheduled_date) && <small className="review-schedule-meta">{item.day_number ? `اليوم ${item.day_number}` : ""}{item.day_number && item.scheduled_date ? " · " : ""}{formatDate(item.scheduled_date)}</small>}
        </div>
        <div className="review-points-badge"><span>⭐ {item.achievement_points}</span></div>
      </div>
    );
  }

  function TeacherCard({ item }: { item: ReviewItem }) {
    const draft = drafts[item.segment_id] || initialDraft(item);
    return (
      <article className="quran-review-card teacher-authority-card" key={item.segment_id}>
        <ItemHeader item={item} badge="قرار المعلم مطلوب" />
        <QuranTextDisplay uthmaniText={item.uthmani_text} readableText={item.readable_text} compact initialMode="learning" />
        {item.notes && <div className="task-note review"><strong>تعليمات الخطة</strong><p>{item.notes}</p></div>}
        <AudioPanel item={item} />
        <section className="review-correction-panel">
          <div className="review-panel-heading"><span>✍️</span><div><h3>التقييم المهني</h3><p>سجّل الأخطاء والطلاقة والتجويد، ثم اعتمد الإتقان أو أعد المقطع للتصحيح.</p></div></div>
          <div className="quran-review-fields">
            <label><span>عدد الأخطاء</span><input type="number" min="0" value={draft.mistakes} onChange={(event) => updateDraft(item, "mistakes", event.target.value)} /></label>
            <label><span>الطلاقة</span><div className="score-field"><input type="number" min="0" max="100" value={draft.fluency} onChange={(event) => updateDraft(item, "fluency", event.target.value)} /><small>/ 100</small></div></label>
            <label><span>التجويد</span><div className="score-field"><input type="number" min="0" max="100" value={draft.tajweed} onChange={(event) => updateDraft(item, "tajweed", event.target.value)} /><small>/ 100</small></div></label>
          </div>
          <label className="quran-review-notes"><span>ملاحظات التصحيح</span><textarea rows={3} value={draft.notes} onChange={(event) => updateDraft(item, "notes", event.target.value)} placeholder="مثال: مراجعة مخارج الحروف وموضع الوقف في الآية الثالثة" /></label>
        </section>
        <div className="quran-review-buttons two-actions">
          <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => teacherDecision(item, "mastered")}>✓ اعتماد الإتقان</button>
          <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => teacherDecision(item, "needs_revision")}>↩ إعادة للتصحيح</button>
        </div>
      </article>
    );
  }

  function ParentCard({ item }: { item: ReviewItem }) {
    const isPending = item.review_mode === "parent_supervision_pending";
    const isRevision = item.review_mode === "parent_supervision_revision";
    const badge = isPending ? "قيد المعالجة لدى المعلم" : isRevision ? "أعيد للطالب" : "اعتمده المعلم";
    return (
      <article className={`quran-review-card parent-readonly-review status-${item.status}`} key={item.segment_id}>
        <ItemHeader item={item} badge={badge} />
        <QuranTextDisplay uthmaniText={item.uthmani_text} readableText={item.readable_text} compact initialMode="learning" />
        <AudioPanel item={item} />
        {isPending ? (
          <div className="review-stage-notice waiting"><span>⏳</span><div><strong>بانتظار قرار المعلم</strong><p>ولي الأمر يشاهد ويتابع فقط. التقييم والاعتماد أو الإعادة للتصحيح من صلاحية المعلم.</p></div></div>
        ) : (
          <section className="teacher-result-summary">
            <div className="review-panel-heading"><span>{isRevision ? "🔄" : "✅"}</span><div><h3>{isRevision ? "أعيد المقطع للتصحيح" : "اعتماد المعلم"}</h3><p>{isRevision ? "ينتظر المقطع محاولة جديدة من الطفل." : "تم اعتماد الإتقان وإضافة نقاط الإنجاز."}</p></div></div>
            <div className="teacher-result-grid"><article><small>الأخطاء</small><strong>{item.latest_mistakes_count ?? 0}</strong></article><article><small>الطلاقة</small><strong>{item.latest_fluency_score ?? "—"}{item.latest_fluency_score !== null ? "/100" : ""}</strong></article><article><small>التجويد</small><strong>{item.latest_tajweed_score ?? "—"}{item.latest_tajweed_score !== null ? "/100" : ""}</strong></article></div>
            {item.latest_review_notes && <div className="teacher-review-note"><strong>ملاحظات المعلم</strong><p>{item.latest_review_notes}</p></div>}
          </section>
        )}
      </article>
    );
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل مركز التسميع...</main>;

  const isTeacher = portalType === "teacher";

  return (
    <main className={`quran-review-page polished-review-page ${isTeacher ? "teacher-role-theme teacher-review-workspace" : "parent-role-theme parent-review-workspace"}`}>
      <header className={`dashboard-header role-aware-header ${isTeacher ? "teacher-role-header" : "parent-role-header"}`}>
        <Link className="brand" href={isTeacher ? "/teacher" : "/dashboard"}><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="role-header-actions">
          <span className={`role-identity-badge ${isTeacher ? "teacher" : "parent"}`}><b>{isTeacher ? "المعلم" : "ولي الأمر"}</b><small>{isTeacher ? "تقييم واعتماد" : "متابعة وإشراف"}</small></span>
          <Link className="quiet-button link-submit" href={isTeacher ? "/teacher" : "/dashboard"}>العودة للوحة</Link>
        </div>
      </header>

      <section className={`quran-review-hero role-distinct-hero ${isTeacher ? "teacher-management-hero" : "parent-supervision-hero"}`}>
        <div><span className="section-label">🎙️ {isTeacher ? "المركز المهني للمعلم" : "المتابعة الإشرافية لولي الأمر"}</span><h1>{isTeacher ? "التسميع والتقييم والاعتماد" : "متابعة التسميع والنتائج"}</h1><p>{isTeacher ? "أنت المسؤول عن القرار المهني: اعتماد الإتقان أو إعادة المقطع للتصحيح." : "شاهد تسجيلات الطفل ونتائج المعلم دون تعديل أو اعتماد."}</p></div>
        <strong>{isTeacher ? teacherItems.length : pendingItems.length}<small>{isTeacher ? "تنتظر قرارك" : "قيد تقييم المعلم"}</small></strong>
      </section>

      {error && <p className="form-message error-message sticky-review-message">{error}</p>}
      {success && <p className="form-message success-message sticky-review-message">{success}</p>}

      {isTeacher ? (
        <section className="parent-review-section teacher-section">
          <div className="parent-review-section-head"><span>👨‍🏫</span><div><h2>محاولات تنتظر تقييمك</h2><p>استمع، قيّم، ثم اتخذ القرار النهائي.</p></div><strong>{teacherItems.length}</strong></div>
          {teacherItems.length ? <div className="quran-review-list">{teacherItems.map((item) => <TeacherCard item={item} key={item.segment_id} />)}</div> : <div className="parent-review-section-empty">لا توجد محاولات جديدة بانتظار التقييم.</div>}
        </section>
      ) : (
        <>
          <section className="parent-review-summary"><article className="waiting"><span>⏳</span><div><strong>{pendingItems.length}</strong><small>بانتظار المعلم</small></div></article><article className="revision"><span>🔄</span><div><strong>{revisionItems.length}</strong><small>أعيدت للتصحيح</small></div></article><article className="ready"><span>✅</span><div><strong>{completedItems.length}</strong><small>اعتمدها المعلم</small></div></article></section>
          <div className="parent-review-pipeline">
            <section className="parent-review-section waiting-section"><div className="parent-review-section-head"><span>⏳</span><div><h2>قيد تقييم المعلم</h2><p>متابعة فقط، ولا يلزم من ولي الأمر إجراء.</p></div><strong>{pendingItems.length}</strong></div>{pendingItems.length ? <div className="quran-review-list">{pendingItems.map((item) => <ParentCard item={item} key={item.segment_id} />)}</div> : <div className="parent-review-section-empty">لا توجد مقاطع معلقة لدى المعلم.</div>}</section>
            <section className="parent-review-section revision-section"><div className="parent-review-section-head"><span>🔄</span><div><h2>أعيدت للتصحيح</h2><p>تنتظر محاولة جديدة من الطفل وفق ملاحظات المعلم.</p></div><strong>{revisionItems.length}</strong></div>{revisionItems.length ? <div className="quran-review-list">{revisionItems.map((item) => <ParentCard item={item} key={item.segment_id} />)}</div> : <div className="parent-review-section-empty">لا توجد مقاطع معادة للتصحيح.</div>}</section>
            <section className="parent-review-section ready-section"><div className="parent-review-section-head"><span>✅</span><div><h2>اعتمدها المعلم</h2><p>أحدث المقاطع المتقنة ونتائج تقييمها.</p></div><strong>{completedItems.length}</strong></div>{completedItems.length ? <div className="quran-review-list">{completedItems.slice(0, 20).map((item) => <ParentCard item={item} key={item.segment_id} />)}</div> : <div className="parent-review-section-empty">لم تُعتمد مقاطع بعد.</div>}</section>
          </div>
          <section className="future-parent-rewards-card"><span>🎁</span><div><strong>دور ولي الأمر القادم</strong><p>بعد إتمام برنامج الحفظ أو المهام، سيتمكن ولي الأمر من إرسال مكافأة أو هدية أو شهادة شكر تُضاف إلى سجل إنجازات الطفل.</p></div><small>قريبًا</small></section>
        </>
      )}
    </main>
  );
}
