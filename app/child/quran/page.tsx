"use client";

import { useEffect, useMemo, useState } from "react";
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
  memorized: "بانتظار التسميع",
  recited: "تم التسميع",
  mastered: "متقن",
  needs_revision: "يحتاج مراجعة"
};

function localToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return "";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(`${dateValue}T00:00:00`));
}

export default function ChildQuranPage() {
  const router = useRouter();
  const [data, setData] = useState<QuranData>({ plans: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [recordingSegmentId, setRecordingSegmentId] = useState("");
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

  const todaySegments = useMemo(() => {
    const today = localToday();
    return data.segments.filter((segment) => segment.scheduled_date === today && ["assigned", "needs_revision"].includes(segment.status));
  }, [data.segments]);

  const memorizedSegments = useMemo(
    () => data.segments.filter((segment) => segment.status === "memorized"),
    [data.segments]
  );

  const masteredCount = useMemo(
    () => data.segments.filter((segment) => segment.status === "mastered").length,
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

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز برنامج الحفظ...</main>;

  return (
    <main className="child-quran-page">
      <header className="child-app-header">
        <div><span className="section-label">📖 برنامجي</span><h1>الحفظ والتسميع</h1></div>
      </header>

      {error && <p className="form-message error-message floating-message">{error}</p>}
      {success && <p className="form-message success-message floating-message">{success}</p>}

      <section className="child-quran-hero">
        <div><span>🌙</span><h2>{todaySegments.length > 0 ? "ورد اليوم جاهز" : "خطوة صغيرة كل يوم"}</h2><p>{todaySegments.length > 0 ? "احفظ مقطع اليوم، ثم سجّل تسميعك أو أرسله بدون تسجيل." : "اتبع الجدول اليومي، واحفظ كل مقطع في موعده."}</p></div>
        <div className="child-quran-stats">
          <article><strong>{todaySegments.length}</strong><small>مقاطع اليوم</small></article>
          <article><strong>{memorizedSegments.length}</strong><small>بانتظار التسميع</small></article>
          <article><strong>{masteredCount}</strong><small>مقاطع متقنة</small></article>
        </div>
      </section>

      {data.plans.length === 0 ? (
        <section className="child-friendly-empty child-quran-empty">
          <span>📘</span><strong>لا توجد خطة حفظ بعد</strong><p>سيضيف ولي الأمر خطة الحفظ والمقاطع المناسبة لك.</p>
        </section>
      ) : (
        <>
          <section className="child-quran-plans">
            {data.plans.map((plan) => (
              <article key={plan.id}><span>📚</span><div><strong>{plan.title}</strong><small>{plan.daily_target} آيات يوميًا{plan.duration_days ? ` · ${plan.duration_days} يومًا` : ""}{plan.due_date ? ` · النهاية ${formatDate(plan.due_date)}` : ""}</small></div></article>
            ))}
          </section>

          <section className="child-quran-list-section">
            <div className="child-section-head"><div><span className="section-label">الجدول اليومي</span><h2>مقاطع الحفظ</h2></div><span className="section-color-icon">📖</span></div>
            {data.segments.length === 0 ? (
              <div className="child-friendly-empty"><span>🌤️</span><strong>لا توجد مقاطع بعد</strong><p>سيضيف ولي الأمر أول مقطع قريبًا.</p></div>
            ) : (
              <div className="child-quran-segments">
                {data.segments.map((segment) => {
                  const isRecordingThisSegment = recordingSegmentId === segment.id;
                  return (
                    <article className={`child-quran-segment status-${segment.status} ${isRecordingThisSegment ? "is-reciting" : ""}`} key={segment.id}>
                      <div className="child-task-head">
                        <span className="task-round-icon category-quran">📖</span>
                        <div><span className={`task-status task-status-${segment.status}`}>{statusLabels[segment.status] || segment.status}</span><h3>{segment.portion_label || "مقطع قرآن"}</h3><p>{segment.scheduled_date ? `📅 ${formatDate(segment.scheduled_date)} · ` : ""}{segment.achievement_points} ⭐ {segment.reward_points > 0 ? `· ${segment.reward_points} 💎` : ""}</p></div>
                      </div>

                      {isRecordingThisSegment ? (
                        <div className="child-quran-recitation-cover" role="status" aria-live="polite">
                          <span>🙈</span>
                          <strong>تم إخفاء الآيات أثناء التسميع</strong>
                          <p>سمّع المقطع عن ظهر قلب، وسيعود النص فور إيقاف التسجيل.</p>
                        </div>
                      ) : (
                        <QuranTextDisplay uthmaniText={segment.uthmani_text} readableText={segment.readable_text} />
                      )}

                      {segment.notes && <div className="task-note review"><strong>تعليمات الحفظ</strong><p>{segment.notes}</p></div>}

                      {["assigned", "needs_revision", "memorized"].includes(segment.status) && (
                        <QuranAudioRecorder
                          segmentId={segment.id}
                          hasAudio={Boolean(segment.has_audio)}
                          audioDurationSeconds={segment.audio_duration_seconds}
                          onUploaded={loadData}
                          onRecordingChange={(isRecording) => handleRecordingChange(segment.id, isRecording)}
                        />
                      )}

                      {["assigned", "needs_revision"].includes(segment.status) && !(segment.status === "needs_revision" && segment.has_audio) && (
                        <button className="child-quran-submit secondary-submit" type="button" disabled={busyId === segment.id || isRecordingThisSegment} onClick={() => markMemorized(segment.id)}>{busyId === segment.id ? "جارٍ الإرسال..." : "تم الحفظ — إرسال بدون تسجيل"}</button>
                      )}
                      {segment.status === "memorized" && <div className="child-goal-note">⏳ ينتظر التسميع واعتماد ولي الأمر أو المعلم{segment.has_audio ? "، والتسجيل الصوتي مرفق." : "."}</div>}
                      {segment.status === "mastered" && <div className="child-goal-note success">🎉 مقطع متقن وتمت إضافة نقاطه.</div>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
