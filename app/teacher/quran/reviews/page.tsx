"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import QuranTextDisplay from "../../../components/QuranTextDisplay";
import TeacherWorkspaceNav from "../../TeacherWorkspaceNav";

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
type ReviewFilter = "all" | "audio" | "direct";

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
  const [openItemId, setOpenItemId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
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

    if (queueResult.error) {
      setError(queueResult.error.message || "تعذر تحميل محاولات التسميع.");
    } else {
      const teacherItems = ((queueResult.data || []) as ReviewItem[]).filter((item) => item.review_mode === "teacher");
      setItems(teacherItems);
      setOpenItemId((current) => teacherItems.some((item) => item.segment_id === current) ? current : teacherItems[0]?.segment_id || "");
    }
    setLoading(false);
  }

  useEffect(() => { loadQueue(); }, []);

  const audioCount = useMemo(() => items.filter((item) => item.has_audio).length, [items]);
  const directCount = items.length - audioCount;

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = reviewFilter === "all"
        || (reviewFilter === "audio" && item.has_audio)
        || (reviewFilter === "direct" && !item.has_audio);
      const searchable = `${item.student_name} ${item.plan_title} ${item.portion_label}`.toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [items, reviewFilter, searchQuery]);

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

      <TeacherWorkspaceNav />

      <section className="quran-review-hero role-distinct-hero teacher-management-hero">
        <div className="teacher-hero-content">
          <span className="section-label">المركز المهني للمعلم</span>
          <h1>التسميع والتقييم والاعتماد</h1>
          <p>استمع إلى محاولة الطالب، راجع النص، سجّل التقييم، ثم اتخذ القرار النهائي من مسار واحد واضح.</p>
          <div className="role-scope-strip"><span>استماع</span><span>تقييم الأخطاء</span><span>الطلاقة والتجويد</span><span>اعتماد أو تصحيح</span></div>
        </div>
        <strong>{items.length}<small>محاولات تنتظر قرارك</small></strong>
      </section>

      {error && <p className="form-message error-message sticky-review-message">{error}</p>}
      {success && <p className="form-message success-message sticky-review-message">{success}</p>}

      <section className="teacher-review-flow" aria-label="خطوات مراجعة التسميع">
        <article><span>1</span><div><strong>استمع للمحاولة</strong><small>شغّل التسجيل أو نفّذ التسميع المباشر.</small></div></article>
        <article><span>2</span><div><strong>سجّل التقييم</strong><small>الأخطاء والطلاقة والتجويد والملاحظات.</small></div></article>
        <article><span>3</span><div><strong>اتخذ القرار</strong><small>اعتماد الإتقان أو إعادة المقطع للتصحيح.</small></div></article>
      </section>

      <section className="teacher-review-toolbar">
        <label className="teacher-review-search">
          <span>🔎</span>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث باسم الطالب أو الخطة أو المقطع" />
        </label>
        <div className="teacher-review-filter" role="tablist" aria-label="تصفية محاولات التسميع">
          <button className={reviewFilter === "all" ? "active" : ""} type="button" onClick={() => setReviewFilter("all")}>الكل {items.length}</button>
          <button className={reviewFilter === "audio" ? "active" : ""} type="button" onClick={() => setReviewFilter("audio")}>بتسجيل {audioCount}</button>
          <button className={reviewFilter === "direct" ? "active" : ""} type="button" onClick={() => setReviewFilter("direct")}>تسميع مباشر {directCount}</button>
        </div>
      </section>

      <section className="parent-review-section teacher-section">
        <div className="parent-review-section-head">
          <span>👨‍🏫</span>
          <div><h2>محاولات الطلاب الجديدة</h2><p>افتح محاولة واحدة في كل مرة للتركيز وتقليل ازدحام الصفحة.</p></div>
          <strong>{filteredItems.length}</strong>
        </div>

        {filteredItems.length === 0 ? (
          <div className="parent-review-section-empty">لا توجد محاولات مطابقة للبحث أو التصنيف.</div>
        ) : (
          <div className="quran-review-list">
            {filteredItems.map((item) => {
              const draft = drafts[item.segment_id] || initialDraft(item);
              const audioUrl = audioUrls[item.segment_id];
              const isOpen = openItemId === item.segment_id;
              return (
                <article className={`teacher-review-accordion ${isOpen ? "open" : ""}`} key={item.segment_id}>
                  <button className="teacher-review-summary" type="button" onClick={() => setOpenItemId(isOpen ? "" : item.segment_id)} aria-expanded={isOpen}>
                    <div className="teacher-review-summary-main">
                      <span className="teacher-review-student-avatar">{item.student_name.trim().slice(0, 1)}</span>
                      <div className="teacher-review-summary-copy">
                        <h2>{item.student_name}</h2>
                        <p>{item.plan_title} · {item.portion_label}</p>
                        <small>{item.day_number ? `اليوم ${item.day_number}` : "مقطع"}{item.scheduled_date ? ` · ${formatDate(item.scheduled_date)}` : ""}</small>
                      </div>
                    </div>
                    <div className="teacher-review-summary-side">
                      <span className={`teacher-review-audio-badge ${item.has_audio ? "has-audio" : ""}`}>{item.has_audio ? "🎧 تسجيل صوتي" : "🗣️ مباشر"}</span>
                      <span className="teacher-review-points-badge">⭐ {item.achievement_points}</span>
                      <span className="segment-chevron">⌄</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="teacher-review-body">
                      <article className="quran-review-card teacher-authority-card">
                        <QuranTextDisplay uthmaniText={item.uthmani_text} readableText={item.readable_text} compact initialMode="learning" />
                        {item.notes && <div className="task-note review"><strong>تعليمات الخطة</strong><p>{item.notes}</p></div>}

                        <section className={`review-audio-panel ${item.has_audio ? "has-audio" : "no-audio"}`}>
                          <div className="review-panel-heading"><span>{item.has_audio ? "🎧" : "🔇"}</span><div><h3>{item.has_audio ? "تسجيل الطالب الصوتي" : "تسميع مباشر"}</h3><p>{item.has_audio ? `استمع قبل اتخاذ القرار${item.audio_duration_seconds ? ` — المدة ${formatSeconds(item.audio_duration_seconds)}` : ""}.` : "لا يوجد تسجيل مرفوع؛ يمكن إجراء التسميع مباشرة."}</p></div></div>
                          {item.has_audio && !audioUrl && <button className="load-review-audio" type="button" disabled={audioBusyId === item.segment_id} onClick={() => loadAudio(item)}>{audioBusyId === item.segment_id ? "جارٍ تجهيز التسجيل..." : "تشغيل تسجيل الطالب"}</button>}
                          {item.has_audio && audioUrl && <audio className="review-audio-player" controls preload="metadata" src={audioUrl} />}
                        </section>

                        <section className="review-correction-panel">
                          <div className="review-panel-heading"><span>✍️</span><div><h3>التقييم المهني</h3><p>سجّل الملاحظات بوضوح قبل اتخاذ القرار النهائي.</p></div></div>
                          <div className="quran-review-fields">
                            <label><span>عدد الأخطاء</span><input type="number" min="0" value={draft.mistakes} onChange={(event) => updateDraft(item, "mistakes", event.target.value)} /></label>
                            <label><span>الطلاقة</span><div className="score-field"><input type="number" min="0" max="100" value={draft.fluency} onChange={(event) => updateDraft(item, "fluency", event.target.value)} /><small>/ 100</small></div></label>
                            <label><span>التجويد</span><div className="score-field"><input type="number" min="0" max="100" value={draft.tajweed} onChange={(event) => updateDraft(item, "tajweed", event.target.value)} /><small>/ 100</small></div></label>
                          </div>
                          <label className="quran-review-notes"><span>ملاحظات التصحيح</span><textarea rows={3} value={draft.notes} onChange={(event) => updateDraft(item, "notes", event.target.value)} placeholder="مثال: مراجعة مخارج الحروف وموضع الوقف" /></label>
                        </section>

                        <div className="quran-review-buttons two-actions teacher-review-sticky-actions">
                          <button className="approve" type="button" disabled={busyId === item.segment_id} onClick={() => teacherDecision(item, "mastered")}>✓ اعتماد الإتقان</button>
                          <button className="revision" type="button" disabled={busyId === item.segment_id} onClick={() => teacherDecision(item, "needs_revision")}>↩ إعادة للتصحيح</button>
                        </div>
                      </article>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
