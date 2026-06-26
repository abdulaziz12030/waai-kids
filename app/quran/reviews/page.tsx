"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import QuranTextDisplay from "../../components/QuranTextDisplay";

type ReviewMode = "teacher" | "parent_final" | "parent_full";

type ReviewItem = {
  segment_id: string;
  student_id: string;
  student_name: string;
  plan_title: string;
  portion_label: string;
  uthmani_text: string | null;
  readable_text: string | null;
  status: string;
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
  memorized: "بانتظار تقييم التسميع",
  recited: "اجتاز تقييم التسميع",
  needs_revision: "يحتاج مراجعة"
};

function formatSeconds(value: number | null) {
  if (!value) return "";
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function initialDraft(item: ReviewItem): ReviewDraft {
  return {
    mistakes: String(item.latest_mistakes_count ?? 0),
    fluency: item.latest_fluency_score === null ? "" : String(item.latest_fluency_score),
    tajweed: item.latest_tajweed_score === null ? "" : String(item.latest_tajweed_score),
    notes: item.latest_review_notes || ""
  };
}

function modeCopy(mode: ReviewMode) {
  if (mode === "teacher") {
    return {
      badge: "دور المعلم",
      title: "تقييم تسميع الطالب",
      description: "استمع، سجّل الأخطاء والطلاقة والتجويد، ثم أرسل نتيجة الاجتياز لولي الأمر أو أعد المقطع للطالب."
    };
  }
  if (mode === "parent_final") {
    return {
      badge: "دور ولي الأمر",
      title: "الاعتماد النهائي",
      description: "راجع تقييم المعلم، ثم اعتمد الإتقان وإضافة النقاط أو أعد المقطع للمراجعة."
    };
  }
  return {
    badge: "دور ولي الأمر",
    title: "التسميع والاعتماد",
    description: "لا يوجد معلم مرتبط؛ لذلك يستطيع ولي الأمر تقييم التسميع واعتماد الإتقان أو إعادة المقطع."
  };
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
    if (queueResult.error) {
      setError(queueResult.error.message || "تعذر تحميل مقاطع التسميع الآن.");
    } else {
      setItems((queueResult.data || []) as ReviewItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const actionCount = useMemo(() => items.length, [items]);
  const primaryMode = items[0]?.review_mode || (portalType === "teacher" ? "teacher" : "parent_full");
  const heroCopy = modeCopy(primaryMode);

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

    if (status === "mastered") {
      setSuccess("تم اعتماد الإتقان وإضافة النقاط بنجاح.");
    } else if (status === "needs_revision") {
      setSuccess("تمت إعادة المقطع للطالب للمراجعة، وسيظهر مجددًا بعد إرسال محاولة جديدة.");
    } else if (item.review_mode === "teacher") {
      setSuccess("تم حفظ تقييم المعلم وإرسال المقطع لولي الأمر للاعتماد النهائي.");
    } else {
      setSuccess("تم حفظ نتيجة التسميع، ويمكن اعتماد الإتقان لاحقًا.");
    }

    await loadQueue();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل مركز التسميع...</main>;

  return (
    <main className="quran-review-page polished-review-page">
      <header className="dashboard-header">
        <Link className="brand" href={portalType === "teacher" ? "/teacher" : "/dashboard"}><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={portalType === "teacher" ? "/teacher" : "/dashboard"}>العودة للوحة</Link>
      </header>

      <section className="quran-review-hero">
        <div><span className="section-label">🎙️ مركز التسميع</span><h1>{heroCopy.title}</h1><p>{heroCopy.description}</p></div>
        <strong>{actionCount}<small>إجراء مطلوب</small></strong>
      </section>

      <section className="review-role-guide">
        <article><span>👨‍🏫</span><div><strong>المعلم</strong><p>يقيّم الأداء العلمي: الأخطاء والطلاقة والتجويد، ثم يمرر النتيجة لولي الأمر.</p></div></article>
        <article><span>👨‍👩‍👦</span><div><strong>ولي الأمر</strong><p>يعتمد الإتقان النهائي ويمنح النقاط، أو يعيد المقطع للمراجعة. ويتولى التقييم أيضًا عند عدم وجود معلم.</p></div></article>
      </section>

      {error && <p className="form-message error-message sticky-review-message">{error}</p>}
      {success && <p className="form-message success-message sticky-review-message">{success}</p>}

      {items.length === 0 ? (
        <section className="quran-review-empty"><span>🎧</span><h2>لا توجد إجراءات تسميع معلقة</h2><p>{portalType === "teacher" ? "ستظهر هنا محاولات الطلاب الجديدة فقط." : "ستظهر هنا نتائج المعلم الجاهزة للاعتماد، أو محاولات الطفل عند عدم وجود معلم."}</p></section>
      ) : (
        <section className="quran-review-list">
          {items.map((item) => {
            const draft = drafts[item.segment_id] || initialDraft(item);
            const audioUrl = audioUrls[item.segment_id];
            const copy = modeCopy(item.review_mode);
            const showEvaluationForm = item.review_mode !== "parent_final" && item.status === "memorized";
            const showTeacherResult = item.review_mode === "parent_final";

            return (
              <article className={`quran-review-card status-${item.status}`} key={item.segment_id}>
                <div className="quran-review-card-head">
                  <div>
                    <div className="review-mode-row"><span className="quran-plan-status">{statusLabels[item.status] || item.status}</span><span className={`review-mode-badge mode-${item.review_mode}`}>{copy.badge}</span></div>
                    <h2>{item.student_name}</h2>
                    <p>{item.plan_title}</p>
                    <strong className="review-portion-label">{item.portion_label}</strong>
                  </div>
                  <div className="review-points-badge"><span>⭐ {item.achievement_points}</span>{item.reward_points > 0 && <span>💎 {item.reward_points}</span>}</div>
                </div>

                <QuranTextDisplay uthmaniText={item.uthmani_text} readableText={item.readable_text} compact initialMode="learning" />

                {item.notes && <div className="task-note review"><strong>تعليمات الخطة</strong><p>{item.notes}</p></div>}

                <section className={`review-audio-panel ${item.has_audio ? "has-audio" : "no-audio"}`}>
                  <div className="review-panel-heading">
                    <span>{item.has_audio ? "🎧" : "🔇"}</span>
                    <div>
                      <h3>{item.has_audio ? "تسجيل الطالب الصوتي" : "أُرسل المقطع دون تسجيل"}</h3>
                      <p>{item.has_audio ? `استمع إلى التسميع قبل اتخاذ الإجراء${item.audio_duration_seconds ? ` — المدة ${formatSeconds(item.audio_duration_seconds)}` : ""}.` : "يمكن إجراء التسميع المباشر عند الحاجة."}</p>
                    </div>
                  </div>
                  {item.has_audio && !audioUrl && (
                    <button className="load-review-audio" type="button" disabled={audioBusyId === item.segment_id} onClick={() => loadAudio(item)}>
                      {audioBusyId === item.segment_id ? "جارٍ تجهيز التسجيل..." : "تشغيل تسجيل الطالب"}
                    </button>
                  )}
                  {item.has_audio && audioUrl && <audio className="review-audio-player" controls preload="metadata" src={audioUrl} />}
                </section>

                {showTeacherResult && (
                  <section className="teacher-result-summary">
                    <div className="review-panel-heading"><span>📋</span><div><h3>نتيجة تقييم المعلم</h3><p>هذه البيانات للعرض فقط، وقرار ولي الأمر هو الاعتماد النهائي أو الإعادة للمراجعة.</p></div></div>
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
                    <div className="review-panel-heading"><span>✍️</span><div><h3>{item.review_mode === "teacher" ? "تقييم المعلم" : "تسجيل نتيجة التسميع"}</h3><p>{item.review_mode === "teacher" ? "سجّل التقييم العلمي، ولا تُضاف النقاط إلا بعد اعتماد ولي الأمر." : "يمكن حفظ النتيجة أولًا أو اعتماد الإتقان مباشرة."}</p></div></div>
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
          })}
        </section>
      )}
    </main>
  );
}
