"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import QuranTextDisplay from "../../components/QuranTextDisplay";

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
};

type ReviewDraft = {
  mistakes: string;
  fluency: string;
  tajweed: string;
  notes: string;
};

const statusLabels: Record<string, string> = {
  memorized: "بانتظار التسميع",
  recited: "تم التسميع",
  needs_revision: "يحتاج مراجعة"
};

function formatSeconds(value: number | null) {
  if (!value) return "";
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
    if (queueResult.error) setError("تعذر تحميل مقاطع التسميع الآن.");
    else setItems((queueResult.data || []) as ReviewItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const waitingCount = useMemo(() => items.filter((item) => item.status === "memorized").length, [items]);

  function updateDraft(id: string, field: keyof ReviewDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        mistakes: current[id]?.mistakes || "0",
        fluency: current[id]?.fluency || "",
        tajweed: current[id]?.tajweed || "",
        notes: current[id]?.notes || "",
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
      setError(result.data?.error || "تعذر تشغيل تسجيل الطالب.");
      return;
    }

    setAudioUrls((current) => ({ ...current, [item.segment_id]: result.data.signedUrl }));
  }

  async function review(item: ReviewItem, status: "recited" | "mastered" | "needs_revision") {
    const client = supabase;
    if (!client) return;
    const draft = drafts[item.segment_id] || { mistakes: "0", fluency: "", tajweed: "", notes: "" };

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
      setError("تعذر اعتماد نتيجة التسميع.");
      return;
    }

    setSuccess(status === "mastered" ? "تم اعتماد الإتقان وإضافة النقاط." : status === "needs_revision" ? "تمت إعادة المقطع للمراجعة، ويمكن للطالب إرسال تسجيل جديد." : "تم تسجيل التسميع.");
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
        <div><span className="section-label">🎙️ مركز التسميع</span><h1>{portalType === "teacher" ? "متابعة طلابي" : "متابعة حفظ الأبناء"}</h1><p>استمع إلى تسجيل الطالب إن وُجد، ودوّن الأخطاء، ثم سجّل النتيجة.</p></div>
        <strong>{waitingCount}<small>بانتظار التسميع</small></strong>
      </section>

      {error && <p className="form-message error-message sticky-review-message">{error}</p>}
      {success && <p className="form-message success-message sticky-review-message">{success}</p>}

      {items.length === 0 ? (
        <section className="quran-review-empty"><span>🎧</span><h2>لا توجد مقاطع تنتظر المراجعة</h2><p>عندما يرسل الطالب المقطع سيظهر هنا تلقائيًا.</p></section>
      ) : (
        <section className="quran-review-list">
          {items.map((item) => {
            const draft = drafts[item.segment_id] || { mistakes: "0", fluency: "", tajweed: "", notes: "" };
            const audioUrl = audioUrls[item.segment_id];
            return (
              <article className={`quran-review-card status-${item.status}`} key={item.segment_id}>
                <div className="quran-review-card-head">
                  <div>
                    <span className="quran-plan-status">{statusLabels[item.status] || item.status}</span>
                    <h2>{item.student_name}</h2>
                    <p>{item.plan_title}</p>
                    <strong className="review-portion-label">{item.portion_label}</strong>
                  </div>
                  <div className="review-points-badge"><span>⭐ {item.achievement_points}</span>{item.reward_points > 0 && <span>💎 {item.reward_points}</span>}</div>
                </div>

                <QuranTextDisplay uthmaniText={item.uthmani_text} readableText={item.readable_text} compact initialMode="learning" />

                {item.notes && <div className="task-note review"><strong>ملاحظة الخطة</strong><p>{item.notes}</p></div>}

                <section className={`review-audio-panel ${item.has_audio ? "has-audio" : "no-audio"}`}>
                  <div className="review-panel-heading">
                    <span>{item.has_audio ? "🎧" : "🔇"}</span>
                    <div>
                      <h3>{item.has_audio ? "تسجيل الطالب الصوتي" : "أُرسل المقطع دون تسجيل"}</h3>
                      <p>{item.has_audio ? `استمع إلى التسميع قبل اعتماد النتيجة${item.audio_duration_seconds ? ` — المدة ${formatSeconds(item.audio_duration_seconds)}` : ""}.` : "يمكن إجراء التسميع المباشر ثم تسجيل النتيجة أدناه."}</p>
                    </div>
                  </div>
                  {item.has_audio && !audioUrl && (
                    <button className="load-review-audio" type="button" disabled={audioBusyId === item.segment_id} onClick={() => loadAudio(item)}>
                      {audioBusyId === item.segment_id ? "جارٍ تجهيز التسجيل..." : "تشغيل تسجيل الطالب"}
                    </button>
                  )}
                  {item.has_audio && audioUrl && <audio className="review-audio-player" controls preload="metadata" src={audioUrl} />}
                </section>

                <section className="review-correction-panel">
                  <div className="review-panel-heading"><span>✍️</span><div><h3>تسجيل نتيجة التسميع</h3><p>أدخل الملاحظات الأساسية فقط، ويمكن ترك التقييمات فارغة.</p></div></div>
                  <div className="quran-review-fields">
                    <label><span>عدد الأخطاء</span><input type="number" min="0" value={draft.mistakes} onChange={(event) => updateDraft(item.segment_id, "mistakes", event.target.value)} /></label>
                    <label><span>الطلاقة</span><div className="score-field"><input type="number" min="0" max="100" value={draft.fluency} onChange={(event) => updateDraft(item.segment_id, "fluency", event.target.value)} /><small>/ 100</small></div></label>
                    <label><span>التجويد</span><div className="score-field"><input type="number" min="0" max="100" value={draft.tajweed} onChange={(event) => updateDraft(item.segment_id, "tajweed", event.target.value)} /><small>/ 100</small></div></label>
                  </div>
                  <label className="quran-review-notes"><span>ملاحظات التصحيح</span><textarea rows={3} value={draft.notes} onChange={(event) => updateDraft(item.segment_id, "notes", event.target.value)} placeholder="مثال: مراجعة موضع الوقف في الآية الثالثة" /></label>
                </section>

                <div className="quran-review-buttons">
                  <button type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "recited")}>تسجيل التسميع</button>
                  <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "mastered")}>✓ اعتماد الإتقان</button>
                  <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => review(item, "needs_revision")}>↩ إعادة للمراجعة</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
