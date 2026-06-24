"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import QuranTextDisplay from "../../components/QuranTextDisplay";

type QuranPlan = {
  id: string;
  title: string;
  status: string;
  daily_target: number;
  due_date: string | null;
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

export default function ChildQuranPage() {
  const router = useRouter();
  const [data, setData] = useState<QuranData>({ plans: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
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

  const pendingSegments = useMemo(
    () => data.segments.filter((segment) => ["assigned", "needs_revision"].includes(segment.status)),
    [data.segments]
  );

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

    setSuccess("أحسنت! تم إرسال المقطع لولي الأمر للتسميع.");
    await loadData();
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
        <div><span>🌙</span><h2>خطوة صغيرة كل يوم</h2><p>احفظ المقطع، ثم اضغط تم الحفظ ليصل إلى ولي الأمر للتسميع.</p></div>
        <div className="child-quran-stats">
          <article><strong>{pendingSegments.length}</strong><small>مقاطع مطلوبة</small></article>
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
              <article key={plan.id}><span>📚</span><div><strong>{plan.title}</strong><small>{plan.daily_target} آيات يوميًا{plan.due_date ? ` · الهدف ${plan.due_date}` : ""}</small></div></article>
            ))}
          </section>

          <section className="child-quran-list-section">
            <div className="child-section-head"><div><span className="section-label">مقاطع الحفظ</span><h2>ابدأ بالمقطع التالي</h2></div><span className="section-color-icon">📖</span></div>
            {data.segments.length === 0 ? (
              <div className="child-friendly-empty"><span>🌤️</span><strong>لا توجد مقاطع بعد</strong><p>سيضيف ولي الأمر أول مقطع قريبًا.</p></div>
            ) : (
              <div className="child-quran-segments">
                {data.segments.map((segment) => (
                  <article className={`child-quran-segment status-${segment.status}`} key={segment.id}>
                    <div className="child-task-head">
                      <span className="task-round-icon category-quran">📖</span>
                      <div><span className={`task-status task-status-${segment.status}`}>{statusLabels[segment.status] || segment.status}</span><h3>{segment.portion_label || "مقطع قرآن"}</h3><p>{segment.achievement_points} ⭐ {segment.reward_points > 0 ? `· ${segment.reward_points} 💎` : ""}</p></div>
                    </div>
                    <QuranTextDisplay uthmaniText={segment.uthmani_text} readableText={segment.readable_text} />
                    {segment.notes && <div className="task-note review"><strong>ملاحظة ولي الأمر</strong><p>{segment.notes}</p></div>}
                    {["assigned", "needs_revision"].includes(segment.status) && (
                      <button className="child-quran-submit" type="button" disabled={busyId === segment.id} onClick={() => markMemorized(segment.id)}>{busyId === segment.id ? "جارٍ الإرسال..." : "تم الحفظ ✓"}</button>
                    )}
                    {segment.status === "memorized" && <div className="child-goal-note">⏳ ينتظر التسميع واعتماد ولي الأمر.</div>}
                    {segment.status === "mastered" && <div className="child-goal-note success">🎉 مقطع متقن وتمت إضافة نقاطه.</div>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
