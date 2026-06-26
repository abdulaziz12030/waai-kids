"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { quranSurahs } from "../../../../lib/quran-surahs";

type QuranPlan = {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  daily_target: number;
  source_name: string;
  segments_count: number;
  mastered_count: number;
};

type QuranSegment = {
  id: string;
  plan_id: string;
  surah_number: number;
  from_ayah: number | null;
  to_ayah: number | null;
  portion_label: string | null;
  uthmani_text: string | null;
  readable_text: string | null;
  status: string;
  achievement_points: number;
  reward_points: number;
  notes: string | null;
};

const statusLabels: Record<string, string> = {
  assigned: "مطلوب حفظه",
  memorized: "بانتظار التسميع",
  recited: "تم التسميع",
  mastered: "متقن",
  needs_revision: "يحتاج مراجعة"
};

export default function ChildQuranPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [studentName, setStudentName] = useState("");
  const [plans, setPlans] = useState<QuranPlan[]>([]);
  const [segments, setSegments] = useState<QuranSegment[]>([]);
  const [sourceCount, setSourceCount] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [title, setTitle] = useState("خطة حفظ القرآن");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dailyTarget, setDailyTarget] = useState("5");
  const [surahNumber, setSurahNumber] = useState("1");
  const [fromAyah, setFromAyah] = useState("1");
  const [toAyah, setToAyah] = useState("1");
  const [achievementPoints, setAchievementPoints] = useState("10");
  const [rewardPoints, setRewardPoints] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedSurah = useMemo(
    () => quranSurahs.find((surah) => surah.number === Number(surahNumber)) || quranSurahs[0],
    [surahNumber]
  );

  async function loadSegments(planId: string) {
    const client = supabase;
    if (!client || !planId) {
      setSegments([]);
      return;
    }
    const result = await client
      .from("quran_segments")
      .select("id,plan_id,surah_number,from_ayah,to_ayah,portion_label,uthmani_text,readable_text,status,achievement_points,reward_points,notes")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });
    if (!result.error) setSegments((result.data || []) as QuranSegment[]);
  }

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
    else {
      const loadedPlans = (plansResult.data || []) as QuranPlan[];
      setPlans(loadedPlans);
      const planId = loadedPlans.some((plan) => plan.id === selectedPlanId) ? selectedPlanId : loadedPlans[0]?.id || "";
      setSelectedPlanId(planId);
      await loadSegments(planId);
    }
    setSourceCount(sourceResult.count || 0);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [studentId]);
  useEffect(() => { loadSegments(selectedPlanId); }, [selectedPlanId]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;
    setSaving(true); setError(""); setSuccess("");
    const result = await client.rpc("create_quran_plan_basic", {
      p_student_id: studentId,
      p_title: title,
      p_start_date: startDate || null,
      p_due_date: dueDate || null,
      p_daily_target: Number(dailyTarget || 5)
    });
    setSaving(false);
    if (result.error) return setError("تعذر إنشاء خطة الحفظ الآن.");
    setSelectedPlanId(String(result.data || ""));
    setSuccess("تم إنشاء خطة الحفظ بنجاح.");
    await loadData();
  }

  async function addSegment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !selectedPlanId) return setError("أنشئ خطة أو اختر خطة أولًا.");
    const from = Number(fromAyah);
    const to = Number(toAyah);
    if (from < 1 || to < from || to > selectedSurah.ayahs) {
      return setError(`نطاق الآيات غير صحيح. سورة ${selectedSurah.name} عدد آياتها ${selectedSurah.ayahs}.`);
    }

    setSaving(true); setError(""); setSuccess("");
    const result = await client.rpc("parent_add_quran_segment", {
      p_plan_id: selectedPlanId,
      p_surah_number: selectedSurah.number,
      p_from_ayah: from,
      p_to_ayah: to,
      p_portion_label: `سورة ${selectedSurah.name} من الآية ${from} إلى ${to}`,
      p_achievement_points: Math.max(0, Number(achievementPoints || 0)),
      p_reward_points: Math.max(0, Number(rewardPoints || 0)),
      p_notes: notes.trim() || null
    });
    setSaving(false);
    if (result.error) return setError("تعذر إضافة مقطع الحفظ.");
    setNotes("");
    setSuccess("تمت إضافة مقطع الحفظ إلى حساب الطفل.");
    await loadData();
  }

  async function deletePlan(plan: QuranPlan) {
    const confirmed = window.confirm(`حذف خطة "${plan.title}"؟ سيتم حذف كل مقاطعها إذا لم تُحتسب نقاطها.`);
    if (!confirmed) return;
    const client = supabase;
    if (!client) return;
    setBusyPlanId(plan.id);
    setError(""); setSuccess("");
    const result = await client.rpc("delete_quran_plan_shared", { p_plan_id: plan.id });
    setBusyPlanId("");
    if (result.error) {
      setError(result.error.message.includes("نقاط") ? "لا يمكن حذف خطة احتُسبت نقاط أحد مقاطعها." : "تعذر حذف خطة الحفظ.");
      return;
    }
    setSuccess("تم حذف خطة الحفظ ومقاطعها التابعة.");
    await loadData();
  }

  async function reviewSegment(segment: QuranSegment, status: string) {
    const client = supabase;
    if (!client) return;
    setError(""); setSuccess("");
    const result = await client.rpc("parent_review_quran_segment", {
      p_segment_id: segment.id,
      p_status: status,
      p_mistakes_count: 0,
      p_fluency_score: null,
      p_tajweed_score: null,
      p_notes: null
    });
    if (result.error) return setError("تعذر تحديث حالة المقطع.");
    setSuccess(status === "mastered" ? "تم اعتماد الإتقان وإضافة النقاط دون تكرار." : "تم تحديث حالة المقطع.");
    await loadData();
  }

  async function deleteSegment(id: string) {
    const client = supabase;
    if (!client) return;
    const result = await client.rpc("parent_delete_quran_segment", { p_segment_id: id });
    if (result.error) setError(result.error.message.includes("النقاط") ? "لا يمكن حذف مقطع احتُسبت نقاطه." : "تعذر حذف المقطع.");
    else { setSuccess("تم حذف المقطع."); await loadData(); }
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز برنامج الحفظ...</main>;

  return (
    <main className="quran-program-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>

      <section className="quran-program-hero">
        <div className="quran-hero-copy"><span className="section-label">📖 الحفظ والتسميع</span><h1>برنامج حفظ {studentName || "الطفل"}</h1><p>أنشئ الخطة، حدد السورة ومقطع الآيات، ثم تابع الحفظ والتسميع والإتقان.</p><div className="quran-source-badge"><span>✓</span><div><strong>المصدر المعتمد</strong><small>بيانات مجمع الملك فهد — رواية حفص عن عاصم</small></div></div></div>
        <div className="quran-hero-icon">۞</div>
      </section>

      <section className={`quran-source-status ${sourceCount > 0 ? "ready" : "preparing"}`}><span>{sourceCount > 0 ? "✅" : "🛡️"}</span><div><strong>{sourceCount > 0 ? "النص القرآني الرسمي جاهز" : "فهرس السور جاهز"}</strong><p>{sourceCount > 0 ? `تم تحميل ${sourceCount} آية من المصدر الرسمي.` : "يمكن إنشاء الخطط والمقاطع الآن."}</p></div></section>
      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      <section className="quran-plan-manager-card">
        <div><span className="section-label">التحكم بالخطط</span><h2>خطط الحفظ الحالية</h2></div>
        {plans.length === 0 ? <p className="quran-text-pending">لا توجد خطط حفظ حاليًا.</p> : <div className="quran-plan-control-list">{plans.map((plan) => <article key={plan.id} className={selectedPlanId === plan.id ? "active" : ""}><button type="button" onClick={() => setSelectedPlanId(plan.id)}><span>📘</span><div><strong>{plan.title}</strong><small>{plan.segments_count} مقاطع · {plan.mastered_count} متقنة</small></div></button><button className="delete-plan-button" type="button" disabled={busyPlanId === plan.id} onClick={() => deletePlan(plan)}>{busyPlanId === plan.id ? "جارٍ الحذف..." : "حذف الخطة"}</button></article>)}</div>}
      </section>

      <section className="quran-program-layout">
        <form className="quran-plan-form auth-form" onSubmit={createPlan}>
          <div><span className="section-label">خطة جديدة</span><h2>إنشاء برنامج حفظ</h2></div>
          <label>اسم الخطة<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <div className="form-grid-two"><label>تاريخ البداية<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>تاريخ الإنجاز<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
          <label>الهدف اليومي بالآيات<input type="number" min="1" max="50" value={dailyTarget} onChange={(event) => setDailyTarget(event.target.value)} /></label>
          <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "إنشاء الخطة"}</button>
        </form>

        <form className="quran-plan-form auth-form" onSubmit={addSegment}>
          <div><span className="section-label">مقطع جديد</span><h2>إضافة واجب الحفظ</h2></div>
          <label>الخطة<select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}><option value="">اختر الخطة</option>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.title}</option>)}</select></label>
          <label>السورة<select value={surahNumber} onChange={(event) => { setSurahNumber(event.target.value); setFromAyah("1"); setToAyah("1"); }}>{quranSurahs.map((surah) => <option value={surah.number} key={surah.number}>{surah.number}. {surah.name} — {surah.ayahs} آية</option>)}</select></label>
          <div className="form-grid-two"><label>من الآية<input type="number" min="1" max={selectedSurah.ayahs} value={fromAyah} onChange={(event) => setFromAyah(event.target.value)} /></label><label>إلى الآية<input type="number" min="1" max={selectedSurah.ayahs} value={toAyah} onChange={(event) => setToAyah(event.target.value)} /></label></div>
          <div className="form-grid-two"><label>نقاط الإنجاز<input type="number" min="0" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} /></label><label>نقاط المكافآت<input type="number" min="0" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} /></label></div>
          <label>ملاحظات<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="مثل: تكرار المقطع خمس مرات" /></label>
          <button className="auth-submit" type="submit" disabled={saving || !selectedPlanId}>{saving ? "جارٍ الإضافة..." : "إضافة المقطع"}</button>
        </form>
      </section>

      <section className="quran-plans-card quran-full-card">
        <div className="quran-card-head"><div><span className="section-label">المتابعة</span><h2>مقاطع الحفظ والتسميع</h2></div><span>{segments.length}</span></div>
        {segments.length === 0 ? <div className="quran-empty-state"><span>📖</span><h3>لا توجد مقاطع بعد</h3><p>اختر الخطة والسورة ثم أضف أول مقطع.</p></div> : <div className="quran-segments-grid">{segments.map((segment) => <article className={`quran-segment-card status-${segment.status}`} key={segment.id}><div className="quran-plan-item-head"><div><span className="quran-plan-status">{statusLabels[segment.status] || segment.status}</span><h3>{segment.portion_label}</h3></div><strong>{segment.achievement_points} ⭐ {segment.reward_points > 0 ? `+ ${segment.reward_points} 💎` : ""}</strong></div>{segment.readable_text ? <p className="quran-readable-text">{segment.readable_text}</p> : <p className="quran-text-pending">تعذر تحميل نص المقطع.</p>}{segment.notes && <p className="quran-segment-note">ملاحظة: {segment.notes}</p>}<div className="quran-review-actions"><button type="button" onClick={() => reviewSegment(segment, "memorized")}>تم الحفظ</button><button type="button" onClick={() => reviewSegment(segment, "recited")}>تم التسميع</button><button className="approve" type="button" onClick={() => reviewSegment(segment, "mastered")}>اعتماد الإتقان</button><button className="revision" type="button" onClick={() => reviewSegment(segment, "needs_revision")}>يحتاج مراجعة</button><button className="delete" type="button" onClick={() => deleteSegment(segment.id)}>حذف</button></div></article>)}</div>}
      </section>
    </main>
  );
}
