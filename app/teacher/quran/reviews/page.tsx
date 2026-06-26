"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import QuranTextDisplay from "../../../components/QuranTextDisplay";

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
  has_audio: boolean;
  audio_duration_seconds: number | null;
  review_mode: string;
  latest_mistakes_count: number | null;
  latest_fluency_score: number | null;
  latest_tajweed_score: number | null;
  latest_review_notes: string | null;
};

type ReviewDraft = {
  mistakes: string;
  fluency: string;
  tajweed: string;
  notes: string;
};

type PortalAccess = { teacher?: boolean; family?: boolean };

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

export default function TeacherQuranReviewCenterPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewItem[]>([]);
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
      router.replace("/login?type=teacher");
      return;
    }

    const [accessResult, queueResult] = await Promise.all([
      client.rpc("get_my_portal_access"),
      client.rpc("get_quran_review_queue")
    ]);

    const access = (accessResult.data || {}) as PortalAccess;
    if (!access.teacher) {
      router.replace(access.family ? "/dashboard" : "/onboarding");
      return;
    }

    if (queueResult.error) setError(queueResult.error.message || "تعذر تحميل محاولات التسميع.");
    else setItems(((queueResult.data || []) as ReviewItem[]).filter((item) => item.review_mode === "teacher"));
    setLoading(false);
  }

  useEffect(() => { loadQueue(); }, []);

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
    if (!client) return;
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

    setSuccess(status === "mastered" ? "تم اعتماد إتقان المقطع وإضافة نقاط الإنجاز." : "تمت إعادة المقطع للطالب للتصحيح.");
    await loadQueue();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل مركز التسميع للمعلم...</main>;

  return (
    <main className="quran-review-page polished-review-page teacher-role-theme teacher-review-workspace">
      <header className="dashboard-header role-aware-header teacher-role-header">
        <Link className="brand" href="/teacher"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="role-header-actions">
          <span className="role-identity-badge teacher"><b>المعلم</b><small>مركز التسميع</small></span>
          <Link className="quiet-button link-submit" href="/teacher">لوحة المعلم</Link>
        </div>
      </header>

      <section className="quran-review-hero role-distinct-hero teacher-management-hero">
        <div><span className="section-label">🎙️ المركز المهني للمعلم</span><h1>التسميع والتقييم والاعتماد</h1><p>هذا المركز خاص بالمعلم: استمع إلى تسجيل الطالب، قيّم الأداء، ثم اعتمد الإتقان أو أعد المقطع للتصحيح.</p></div>
        <strong>{items.length}<small>تنتظر قرارك</small></strong>
      </section>

      {error && <p className="form-message error-message sticky-review-message">{error}</p>}
      {success && <p className="form-message success-message sticky-review-message">{success}</p>}

      <section className="parent-review-section teacher-section">
        <div className="parent-review-section-head"><span>👨‍🏫</span><div><h2>محاولات الطلاب الجديدة</h2><p>تظهر هنا المحاولات التي تحتاج تقييمًا مهنيًا فقط.</p></div><strong>{items.length}</strong></div>
        {items.length === 0 ? (
          <div className="parent-review-section-empty">لا توجد محاولات جديدة بانتظار التقييم.</div>
        ) : (
          <div className="quran-review-list">
            {items.map((item) => {
              const draft = drafts[item.segment_id] || initialDraft(item);
              const audioUrl = audioUrls[item.segment_id];
              return (
                <article className="quran-review-card teacher-authority-card" key={item.segment_id}>
                  <div className="quran-review-card-head">
                    <div>
                      <div className="review-mode-row"><span className="quran-plan-status">بانتظار تقييمك</span><span className="review-mode-badge mode-teacher">قرار المعلم مطلوب</span></div>
                      <h2>{item.student_name}</h2><p>{item.plan_title}</p><strong className="review-portion-label">{item.portion_label}</strong>
                      {(item.day_number || item.scheduled_date) && <small className="review-schedule-meta">{item.day_number ? `اليوم ${item.day_number}` : ""}{item.day_number && item.scheduled_date ? " · " : ""}{formatDate(item.scheduled_date)}</small>}
                    </div>
                    <div className="review-points-badge"><span>⭐ {item.achievement_points}</span></div>
                  </div>

                  <QuranTextDisplay uthmaniText={item.uthmani_text} readableText={item.readable_text} compact initialMode="learning" />
                  {item.notes && <div className="task-note review"><strong>تعليمات الخطة</strong><p>{item.notes}</p></div>}

                  <section className={`review-audio-panel ${item.has_audio ? "has-audio" : "no-audio"}`}>
                    <div className="review-panel-heading"><span>{item.has_audio ? "🎧" : "🔇"}</span><div><h3>{item.has_audio ? "تسجيل الطالب الصوتي" : "أرسل الطالب المقطع دون تسجيل"}</h3><p>{item.has_audio ? `استمع قبل اتخاذ القرار${item.audio_duration_seconds ? ` — المدة ${formatSeconds(item.audio_duration_seconds)}` : ""}.` : "يمكن إجراء التسميع المباشر."}</p></div></div>
                    {item.has_audio && !audioUrl && <button className="load-review-audio" type="button" disabled={audioBusyId === item.segment_id} onClick={() => loadAudio(item)}>{audioBusyId === item.segment_id ? "جارٍ تجهيز التسجيل..." : "تشغيل تسجيل الطالب"}</button>}
                    {item.has_audio && audioUrl && <audio className="review-audio-player" controls preload="metadata" src={audioUrl} />}
                  </section>

                  <section className="review-correction-panel">
                    <div className="review-panel-heading"><span>✍️</span><div><h3>التقييم المهني</h3><p>سجّل الأخطاء والطلاقة والتجويد، ثم اتخذ القرار النهائي.</p></div></div>
                    <div className="quran-review-fields">
                      <label><span>عدد الأخطاء</span><input type="number" min="0" value={draft.mistakes} onChange={(event) => updateDraft(item, "mistakes", event.target.value)} /></label>
                      <label><span>الطلاقة</span><div className="score-field"><input type="number" min="0" max="100" value={draft.fluency} onChange={(event) => updateDraft(item, "fluency", event.target.value)} /><small>/ 100</small></div></label>
                      <label><span>التجويد</span><div className="score-field"><input type="number" min="0" max="100" value={draft.tajweed} onChange={(event) => updateDraft(item, "tajweed", event.target.value)} /><small>/ 100</small></div></label>
                    </div>
                    <label className="quran-review-notes"><span>ملاحظات التصحيح</span><textarea rows={3} value={draft.notes} onChange={(event) => updateDraft(item, "notes", event.target.value)} placeholder="مثال: مراجعة مخارج الحروف وموضع الوقف" /></label>
                  </section>

                  <div className="quran-review-buttons two-actions">
                    <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => teacherDecision(item, "mastered")}>✓ اعتماد الإتقان</button>
                    <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => teacherDecision(item, "needs_revision")}>↩ إعادة للتصحيح</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
