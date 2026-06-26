"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import QuranTextDisplay from "../../components/QuranTextDisplay";

type ReviewMode =
  | "teacher"
  | "parent_final"
  | "parent_full"
  | "parent_waiting_teacher"
  | "parent_revision";

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
  reward_points: number;
  notes: string | null;
  memorized_at: string | null;
  has_audio: boolean;
  audio_submitted_at: string | null;
  audio_duration_seconds: number | null;
  review_mode: ReviewMode;
  has_active_teacher: boolean;
  latest_mistakes_count: number | null;
  latest_fluency_score: number | null;
  latest_tajweed_score: number | null;
  latest_review_notes: string | null;
  latest_reviewer_type: string | null;
  latest_reviewed_at: string | null;
  teacher_mistakes_count: number | null;
  teacher_fluency_score: number | null;
  teacher_tajweed_score: number | null;
  teacher_review_notes: string | null;
  teacher_reviewed_at: string | null;
};

type ReviewDraft = {
  mistakes: string;
  fluency: string;
  tajweed: string;
  notes: string;
};

const statusLabels: Record<string, string> = {
  memorized: "أرسل الطفل التسميع",
  recited: "اجتاز تقييم المعلم",
  needs_revision: "أعيد للطالب للمراجعة"
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

function modeLabel(mode: ReviewMode) {
  if (mode === "teacher") return "مطلوب من المعلم";
  if (mode === "parent_final") return "جاهز لاعتماد ولي الأمر";
  if (mode === "parent_waiting_teacher") return "بانتظار تقييم المعلم";
  if (mode === "parent_revision") return "بانتظار محاولة جديدة";
  return "مطلوب من ولي الأمر";
}

export default function QuranReviewsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [portalType, setPortalType] = useState<"family" | "teacher" | "new">("new");
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [audioBusyId, setAudioBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
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

    if (!typeResult.error) setPortalType((typeResult.data || "new") as "family" | "teacher" | "new");
    if (queueResult.error) setError(queueResult.error.message || "تعذر تحميل مقاطع التسميع الآن.");
    else setItems((queueResult.data || []) as ReviewItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const teacherItems = useMemo(() => items.filter((item) => item.review_mode === "teacher"), [items]);
  const readyItems = useMemo(
    () => items.filter((item) => ["parent_final", "parent_full"].includes(item.review_mode)),
    [items]
  );
  const waitingTeacherItems = useMemo(
    () => items.filter((item) => item.review_mode === "parent_waiting_teacher"),
    [items]
  );
  const revisionItems = useMemo(
    () => items.filter((item) => item.review_mode === "parent_revision"),
    [items]
  );

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

  async function review(item: ReviewItem, status: "recited" | "mastered" | "needs_revision") {
    const client = supabase;
    if (!client) return;
    const draft = drafts[item.segment_id] || initialDraft(item);
    const isFinalParentApproval = item.review_mode === "parent_final";

    setBusyId(item.segment_id);
    setError("");
    setSuccess("");
    const result = await client.rpc("review_quran_segment_shared", {
      p_segment_id: item.segment_id,
      p_status: status,
      p_mistakes_count: isFinalParentApproval ? 0 : Math.max(0, Number(draft.mistakes || 0)),
      p_fluency_score: isFinalParentApproval || !draft.fluency ? null : Number(draft.fluency),
      p_tajweed_score: isFinalParentApproval || !draft.tajweed ? null : Number(draft.tajweed),
      p_notes: isFinalParentApproval ? null : draft.notes || null
    });
    setBusyId("");

    if (result.error) {
      setError(result.error.message || "تعذر حفظ الإجراء.");
      return;
    }

    if (status === "mastered") setSuccess("تم اعتماد الإتقان وإضافة النقاط بنجاح.");
    else if (status === "needs_revision") setSuccess("تمت إعادة المقطع للطالب للمراجعة.");
    else if (item.review_mode === "teacher") setSuccess("تم إرسال تقييم المعلم لولي الأمر للاعتماد النهائي.");
    else setSuccess("تم حفظ نتيجة التسميع.");

    await loadQueue();
  }

  function renderCard(item: ReviewItem) {
    const draft = drafts[item.segment_id] || initialDraft(item);
    const audioUrl = audioUrls[item.segment_id];
    const isWaitingTeacher = item.review_mode === "parent_waiting_teacher";
    const isRevision = item.review_mode === "parent_revision";
    const showEvaluationForm = ["teacher", "parent_full"].includes(item.review_mode) && item.status === "memorized";
    const showTeacherResult = item.review_mode === "parent_final";
    const showAudio = !isRevision;

    return (
      <article className={`quran-review-card status-${item.status} mode-${item.review_mode}`} key={item.segment_id}>
        <div className="quran-review-card-head">
          <div>
            <div className="review-mode-row">
              <span className="quran-plan-status">{statusLabels[item.status] || item.status}</span>
              <span className={`review-mode-badge mode-${item.review_mode}`}>{modeLabel(item.review_mode)}</span>
            </div>
            <h2>{item.student_name}</h2>
            <p>{item.plan_title}</p>
            <strong className="review-portion-label">{item.portion_label}</strong>
            {(item.scheduled_date || item.day_number) && (
              <small className="review-schedule-meta">
                {item.day_number ? `اليوم ${item.day_number}` : ""}
                {item.day_number && item.scheduled_date ? " · " : ""}
                {item.scheduled_date ? formatDate(item.scheduled_date) : ""}
              </small>
            )}
          </div>
          <div className="review-points-badge"><span>⭐ {item.achievement_points}</span>{item.reward_points > 0 && <span>💎 {item.reward_points}</span>}</div>
        </div>

        <QuranTextDisplay uthmaniText={item.uthmani_text} readableText={item.readable_text} compact initialMode="learning" />
        {item.notes && <div className="task-note review"><strong>تعليمات الخطة</strong><p>{item.notes}</p></div>}

        {showAudio && (
          <section className={`review-audio-panel ${item.has_audio ? "has-audio" : "no-audio"}`}>
            <div className="review-panel-heading">
              <span>{item.has_audio ? "🎧" : "🔇"}</span>
              <div>
                <h3>{item.has_audio ? "تسجيل الطالب الصوتي" : "أُرسل المقطع دون تسجيل"}</h3>
                <p>{item.has_audio ? `يمكن الاستماع إلى التسميع${item.audio_duration_seconds ? ` — المدة ${formatSeconds(item.audio_duration_seconds)}` : ""}.` : "يمكن إجراء التسميع المباشر عند الحاجة."}</p>
              </div>
            </div>
            {item.has_audio && !audioUrl && (
              <button className="load-review-audio" type="button" disabled={audioBusyId === item.segment_id} onClick={() => loadAudio(item)}>
                {audioBusyId === item.segment_id ? "جارٍ تجهيز التسجيل..." : "تشغيل تسجيل الطالب"}
              </button>
            )}
            {item.has_audio && audioUrl && <audio className="review-audio-player" controls preload="metadata" src={audioUrl} />}
          </section>
        )}

        {isWaitingTeacher && (
          <div className="review-stage-notice waiting">
            <span>⏳</span><div><strong>المقطع عند المعلم الآن</strong><p>لا يلزم منك إجراء حاليًا. بعد اجتياز تقييم المعلم سينتقل تلقائيًا إلى قسم «جاهز لاعتمادك».</p></div>
          </div>
        )}

        {isRevision && (
          <div className="review-stage-notice revision">
            <span>🔄</span><div><strong>بانتظار محاولة جديدة من الطفل</strong><p>أعيد هذا المقطع للمراجعة، وسيظهر مجددًا عند المعلم بعد أن يسجل الطفل أو يرسل محاولة جديدة.</p>{item.latest_review_notes && <p className="stage-last-note"><b>آخر ملاحظة:</b> {item.latest_review_notes}</p>}</div>
          </div>
        )}

        {showTeacherResult && (
          <section className="teacher-result-summary">
            <div className="review-panel-heading"><span>📋</span><div><h3>نتيجة تقييم المعلم</h3><p>راجع النتيجة ثم اعتمد الإتقان أو أعد المقطع للمراجعة.</p></div></div>
            <div className="teacher-result-grid">
              <article><small>عدد الأخطاء</small><strong>{item.teacher_mistakes_count ?? 0}</strong></article>
              <article><small>الطلاقة</small><strong>{item.teacher_fluency_score ?? "—"}{item.teacher_fluency_score !== null ? "/100" : ""}</strong></article>
              <article><small>التجويد</small><strong>{item.teacher_tajweed_score ?? "—"}{item.teacher_tajweed_score !== null ? "/100" : ""}</strong></article>
            </div>
            {item.teacher_review_notes && <div className="teacher-review-note"><strong>ملاحظات المعلم</strong><p>{item.teacher_review_notes}</p></div>}
          </section>
        )}

        {showEvaluationForm && (
          <section className="review-correction-panel">
            <div className="review-panel-heading"><span>✍️</span><div><h3>{item.review_mode === "teacher" ? "تقييم المعلم" : "تسجيل نتيجة التسميع"}</h3><p>{item.review_mode === "teacher" ? "سجّل التقييم العلمي ثم مرره لولي الأمر." : "لا يوجد معلم مرتبط؛ يمكنك تقييم التسميع واعتماده مباشرة."}</p></div></div>
            <div className="quran-review-fields">
              <label><span>عدد الأخطاء</span><input type="number" min="0" value={draft.mistakes} onChange={(event) => updateDraft(item, "mistakes", event.target.value)} /></label>
              <label><span>الطلاقة</span><div className="score-field"><input type="number" min="0" max="100" value={draft.fluency} onChange={(event) => updateDraft(item, "fluency", event.target.value)} /><small>/ 100</small></div></label>
              <label><span>التجويد</span><div className="score-field"><input type="number" min="0" max="100" value={draft.tajweed} onChange={(event) => updateDraft(item, "tajweed", event.target.value)} /><small>/ 100</small></div></label>
            </div>
            <label className="quran-review-notes"><span>ملاحظات التصحيح</span><textarea rows={3} value={draft.notes} onChange={(event) => updateDraft(item, "notes", event.target.value)} placeholder="مثال: مراجعة موضع الوقف في الآية الثالثة" /></label>
          </section>
        )}

        {item.review_mode === "teacher" && (
          <div className="quran-review-buttons two-actions">
            <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "recited")}>✓ اجتاز التسميع وإرساله لولي الأمر</button>
            <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "needs_revision")}>↩ إعادة للطالب للمراجعة</button>
          </div>
        )}

        {item.review_mode === "parent_final" && (
          <div className="quran-review-buttons two-actions">
            <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "mastered")}>✓ اعتماد الإتقان وإضافة النقاط</button>
            <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "needs_revision")}>↩ إعادة للمراجعة</button>
          </div>
        )}

        {item.review_mode === "parent_full" && item.status === "memorized" && (
          <div className="quran-review-buttons">
            <button type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "recited")}>حفظ نتيجة التسميع</button>
            <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "mastered")}>✓ اعتماد الإتقان مباشرة</button>
            <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "needs_revision")}>↩ إعادة للطالب للمراجعة</button>
          </div>
        )}

        {item.review_mode === "parent_full" && item.status === "recited" && (
          <div className="quran-review-buttons two-actions">
            <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "mastered")}>✓ اعتماد الإتقان وإضافة النقاط</button>
            <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "needs_revision")}>↩ إعادة للمراجعة</button>
          </div>
        )}
      </article>
    );
  }

  function renderSection(title: string, description: string, icon: string, sectionItems: ReviewItem[], emptyText: string, className: string) {
    return (
      <section className={`parent-review-section ${className}`}>
        <div className="parent-review-section-head"><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div><strong>{sectionItems.length}</strong></div>
        {sectionItems.length > 0 ? <div className="quran-review-list">{sectionItems.map(renderCard)}</div> : <div className="parent-review-section-empty">{emptyText}</div>}
      </section>
    );
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل مركز التسميع...</main>;

  return (
    <main className="quran-review-page polished-review-page">
      <header className="dashboard-header">
        <Link className="brand" href={portalType === "teacher" ? "/teacher" : "/dashboard"}><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={portalType === "teacher" ? "/teacher" : "/dashboard"}>العودة للوحة</Link>
      </header>

      <section className="quran-review-hero">
        <div><span className="section-label">🎙️ مركز التسميع</span><h1>{portalType === "teacher" ? "تقييم تسميع الطلاب" : "التسميع والاعتماد"}</h1><p>{portalType === "teacher" ? "راجع المحاولات الجديدة، ثم مرّر المجتاز منها لولي الأمر." : "تابع كل مقطع من إرسال الطفل حتى تقييم المعلم ثم اعتماد الإتقان."}</p></div>
        <strong>{portalType === "teacher" ? teacherItems.length : readyItems.length}<small>{portalType === "teacher" ? "بانتظار تقييمك" : "جاهز لاعتمادك"}</small></strong>
      </section>

      {portalType === "family" && (
        <section className="parent-review-summary">
          <article className="ready"><span>✅</span><div><strong>{readyItems.length}</strong><small>جاهز لاعتمادك</small></div></article>
          <article className="waiting"><span>⏳</span><div><strong>{waitingTeacherItems.length}</strong><small>بانتظار المعلم</small></div></article>
          <article className="revision"><span>🔄</span><div><strong>{revisionItems.length}</strong><small>معاد للطالب</small></div></article>
        </section>
      )}

      {error && <p className="form-message error-message sticky-review-message">{error}</p>}
      {success && <p className="form-message success-message sticky-review-message">{success}</p>}

      {portalType === "teacher" ? (
        renderSection("محاولات تنتظر تقييمك", "استمع إلى التسجيل وسجّل النتيجة العلمية.", "👨‍🏫", teacherItems, "لا توجد محاولات جديدة بانتظار تقييمك.", "teacher-section")
      ) : (
        <div className="parent-review-pipeline">
          {renderSection("جاهز لاعتمادك", "هذه المقاطع اجتازت تقييم المعلم، أو لا يوجد لها معلم مرتبط.", "✅", readyItems, "لا توجد مقاطع جاهزة لاعتمادك الآن.", "ready-section")}
          {renderSection("بانتظار تقييم المعلم", "يمكنك متابعة المقطع والاستماع إليه، لكن لا يلزم منك إجراء حتى ينهي المعلم تقييمه.", "⏳", waitingTeacherItems, "لا توجد مقاطع معلقة عند المعلم.", "waiting-section")}
          {renderSection("أعيدت للطالب للمراجعة", "هذه المقاطع تنتظر أن يرسل الطفل محاولة جديدة.", "🔄", revisionItems, "لا توجد مقاطع معادة للمراجعة.", "revision-section")}
        </div>
      )}
    </main>
  );
}
