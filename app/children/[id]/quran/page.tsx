"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type QuranPlan = {
  id: string;
  title: string;
  status: string;
  plan_type: string;
  start_date: string | null;
  due_date: string | null;
  daily_target: number;
  source_name: string;
  segments_count: number;
  mastered_count: number;
};

export default function ChildQuranPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [studentName, setStudentName] = useState("");
  const [plans, setPlans] = useState<QuranPlan[]>([]);
  const [sourceCount, setSourceCount] = useState(0);
  const [title, setTitle] = useState("خطة حفظ القرآن");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dailyTarget, setDailyTarget] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    const client = supabase;
    if (!client) return;

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }

    const [studentResult, plansResult, sourceResult] = await Promise.all([
      client.from("students").select("full_name").eq("id", studentId).maybeSingle(),
      client.rpc("get_parent_quran_plans", { p_student_id: studentId }),
      client.from("quran_ayahs").select("id", { count: "exact", head: true })
    ]);

    if (studentResult.data) setStudentName(studentResult.data.full_name);
    if (plansResult.error) setError("تعذر تحميل خطط الحفظ.");
    else setPlans((plansResult.data || []) as QuranPlan[]);
    setSourceCount(sourceResult.count || 0);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;

    setSaving(true);
    setError("");
    setSuccess("");
    const result = await client.rpc("create_quran_plan_basic", {
      p_student_id: studentId,
      p_title: title,
      p_start_date: startDate || null,
      p_due_date: dueDate || null,
      p_daily_target: Number(dailyTarget || 5)
    });
    setSaving(false);

    if (result.error) {
      setError("تعذر إنشاء خطة الحفظ الآن.");
      return;
    }

    setSuccess("تم إنشاء الخطة. الخطوة التالية هي إضافة السور ومقاطع الحفظ.");
    await loadData();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز برنامج الحفظ...</main>;

  return (
    <main className="quran-program-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>

      <section className="quran-program-hero">
        <div className="quran-hero-copy">
          <span className="section-label">📖 الحفظ والتسميع</span>
          <h1>برنامج حفظ {studentName || "الطفل"}</h1>
          <p>أنشئ خطة واضحة للحفظ والمراجعة، ثم تابع المقاطع والتسميع والإتقان خطوة بخطوة.</p>
          <div className="quran-source-badge"><span>✓</span><div><strong>المصدر المعتمد</strong><small>الرسم العثماني — رواية حفص عن عاصم — مجمع الملك فهد</small></div></div>
        </div>
        <div className="quran-hero-icon">۞</div>
      </section>

      <section className={`quran-source-status ${sourceCount > 0 ? "ready" : "preparing"}`}>
        <span>{sourceCount > 0 ? "✅" : "⏳"}</span>
        <div>
          <strong>{sourceCount > 0 ? "النص القرآني الرسمي جاهز" : "تم تجهيز بنية النص القرآني"}</strong>
          <p>{sourceCount > 0 ? `تم تحميل ${sourceCount} آية بالرسم العثماني.` : "سيتم استيراد ملف الآيات الرسمي من منصة مطوري مجمع الملك فهد في الخطوة التالية؛ لا نعرض نصوصًا غير موثقة."}</p>
        </div>
      </section>

      <section className="quran-program-layout">
        <form className="quran-plan-form auth-form" onSubmit={createPlan}>
          <div><span className="section-label">خطة جديدة</span><h2>ابدأ برنامج الحفظ</h2></div>
          <label>اسم الخطة<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <div className="form-grid-two">
            <label>تاريخ البداية<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>تاريخ الإنجاز المتوقع<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>
          <label>الهدف اليومي بالآيات<input type="number" min="1" max="50" value={dailyTarget} onChange={(event) => setDailyTarget(event.target.value)} /></label>
          <div className="quran-plan-note">بعد إنشاء الخطة ستتمكن من اختيار السورة وتحديد بداية ونهاية كل مقطع.</div>
          {error && <p className="form-message error-message">{error}</p>}
          {success && <p className="form-message success-message">{success}</p>}
          <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإنشاء..." : "إنشاء خطة الحفظ"}</button>
        </form>

        <section className="quran-plans-card">
          <div className="quran-card-head"><div><span className="section-label">الخطط</span><h2>برامج الحفظ الحالية</h2></div><span>{plans.length}</span></div>
          {plans.length === 0 ? (
            <div className="quran-empty-state"><span>📖</span><h3>لا توجد خطة بعد</h3><p>أنشئ أول خطة منزلية من النموذج المجاور.</p></div>
          ) : (
            <div className="quran-plans-list">
              {plans.map((plan) => {
                const progress = plan.segments_count > 0 ? Math.round((plan.mastered_count / plan.segments_count) * 100) : 0;
                return (
                  <article key={plan.id} className="quran-plan-item">
                    <div className="quran-plan-item-head"><div><span className="quran-plan-status">{plan.status === "active" ? "نشطة" : plan.status}</span><h3>{plan.title}</h3></div><strong>{progress}%</strong></div>
                    <p>{plan.daily_target} آيات يوميًا · {plan.segments_count} مقطع</p>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                    <div className="quran-plan-meta"><span>بدأت: {plan.start_date || "غير محدد"}</span><span>الهدف: {plan.due_date || "مفتوح"}</span></div>
                    <button type="button" disabled>إضافة مقاطع الحفظ — قريبًا</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="quran-next-features">
        <article><span>🕌</span><strong>حفظ منزلي</strong><p>اعتماد الأب أو الأم للتسميع والمراجعة.</p></article>
        <article><span>👨‍🏫</span><strong>ربط المعلم</strong><p>البنية مهيأة لحساب المعلم والحلقات لاحقًا.</p></article>
        <article><span>🎙️</span><strong>محاولات التسميع</strong><p>تسجيل الأخطاء والطلاقة والتجويد والملاحظات.</p></article>
        <article><span>⭐</span><strong>نقاط التحفيز</strong><p>ربط الحفظ بنقاط الإنجاز والمكافآت.</p></article>
      </section>
    </main>
  );
}
