"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import { quranSurahs } from "../../../../../lib/quran-surahs";
import TeacherWorkspaceNav from "../../../TeacherWorkspaceNav";

type QuranPlan = {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  daily_target: number;
  source_name: string;
  duration_days: number | null;
  segments_count: number;
  assigned_count: number;
  waiting_count: number;
  revision_count: number;
  mastered_count: number;
};

type QuranSegment = {
  id: string;
  plan_id: string;
  portion_label: string | null;
  readable_text: string | null;
  status: string;
  achievement_points: number;
  notes: string | null;
  scheduled_date: string | null;
  day_number: number | null;
};

type ScheduledPlanResult = {
  plan_id: string;
  surah_name: string;
  total_ayahs: number;
  duration_days: number;
  scheduled_days: number;
  review_days: number;
  daily_min: number;
  daily_max: number;
};

type PortalAccess = { teacher?: boolean; family?: boolean };
type TeacherSegmentFilter = "action" | "due" | "revision" | "mastered" | "all";

const statusLabels: Record<string, string> = {
  assigned: "بانتظار الحفظ",
  memorized: "بانتظار تقييمك",
  recited: "قيد التقييم",
  mastered: "متقن ومعتمد",
  needs_revision: "أعيد للتصحيح"
};

function localToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function isFutureAssigned(segment: QuranSegment, today: string) {
  return segment.status === "assigned" && Boolean(segment.scheduled_date && segment.scheduled_date > today);
}

export default function TeacherStudentQuranPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const today = localToday();
  const [studentName, setStudentName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [plans, setPlans] = useState<QuranPlan[]>([]);
  const [segments, setSegments] = useState<QuranSegment[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<TeacherSegmentFilter>("action");
  const [surahNumber, setSurahNumber] = useState("1");
  const [title, setTitle] = useState("برنامج حفظ سورة الفاتحة");
  const [startDate, setStartDate] = useState(localToday());
  const [durationDays, setDurationDays] = useState("30");
  const [achievementPoints, setAchievementPoints] = useState("10");
  const [notes, setNotes] = useState("");
  const [manualSurahNumber, setManualSurahNumber] = useState("1");
  const [fromAyah, setFromAyah] = useState("1");
  const [toAyah, setToAyah] = useState("1");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedSurah = useMemo(
    () => quranSurahs.find((item) => item.number === Number(surahNumber)) || quranSurahs[0],
    [surahNumber]
  );
  const manualSurah = useMemo(
    () => quranSurahs.find((item) => item.number === Number(manualSurahNumber)) || quranSurahs[0],
    [manualSurahNumber]
  );
  const preview = useMemo(() => {
    const duration = Math.max(1, Number(durationDays || 1));
    const memorizationDays = Math.min(duration, selectedSurah.ayahs);
    const base = Math.floor(selectedSurah.ayahs / memorizationDays);
    const extra = selectedSurah.ayahs % memorizationDays;
    return {
      memorizationDays,
      reviewDays: Math.max(0, duration - memorizationDays),
      dailyMin: base,
      dailyMax: base + (extra > 0 ? 1 : 0),
      dueDate: addDays(startDate, duration - 1)
    };
  }, [durationDays, selectedSurah, startDate]);

  async function loadSegments(planId: string) {
    const client = supabase;
    if (!client || !planId) return setSegments([]);
    const result = await client.rpc("get_quran_plan_segments_shared", { p_plan_id: planId });
    if (!result.error) setSegments((result.data || []) as QuranSegment[]);
  }

  async function loadData() {
    const client = supabase;
    if (!client) return;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return router.replace("/login?type=teacher");

    const [accessResult, studentsResult, plansResult] = await Promise.all([
      client.rpc("get_my_portal_access"),
      client.rpc("get_teacher_students"),
      client.rpc("get_student_quran_plans_shared", { p_student_id: studentId })
    ]);

    const access = (accessResult.data || {}) as PortalAccess;
    if (!access.teacher) return router.replace(access.family ? "/dashboard" : "/onboarding");
    const student = ((studentsResult.data || []) as Array<{ student_id: string; student_name: string; family_name: string }>).find((item) => item.student_id === studentId);
    if (!student) return router.replace("/teacher");
    setStudentName(student.student_name);
    setFamilyName(student.family_name);

    if (plansResult.error) setError("تعذر تحميل خطط الطالب.");
    else {
      const loadedPlans = (plansResult.data || []) as QuranPlan[];
      setPlans(loadedPlans);
      const nextPlanId = loadedPlans.some((plan) => plan.id === selectedPlanId) ? selectedPlanId : loadedPlans[0]?.id || "";
      setSelectedPlanId(nextPlanId);
      await loadSegments(nextPlanId);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [studentId]);
  useEffect(() => { if (selectedPlanId) loadSegments(selectedPlanId); }, [selectedPlanId]);

  const sortedSegments = useMemo(
    () => [...segments].sort((a, b) => (a.day_number || 9999) - (b.day_number || 9999)),
    [segments]
  );

  const actionSegments = useMemo(
    () => sortedSegments.filter((segment) => ["memorized", "recited"].includes(segment.status)),
    [sortedSegments]
  );

  const dueSegments = useMemo(
    () => sortedSegments.filter((segment) => segment.status === "assigned" && !isFutureAssigned(segment, today)),
    [sortedSegments, today]
  );

  const revisionSegments = useMemo(
    () => sortedSegments.filter((segment) => segment.status === "needs_revision"),
    [sortedSegments]
  );

  const masteredSegments = useMemo(
    () => [...sortedSegments].filter((segment) => segment.status === "mastered").reverse(),
    [sortedSegments]
  );

  const upcomingSegments = useMemo(
    () => sortedSegments.filter((segment) => isFutureAssigned(segment, today)),
    [sortedSegments, today]
  );

  const visibleSegments = useMemo(() => {
    if (segmentFilter === "action") return actionSegments;
    if (segmentFilter === "due") return dueSegments;
    if (segmentFilter === "revision") return revisionSegments;
    if (segmentFilter === "mastered") return masteredSegments;
    return [...actionSegments, ...dueSegments, ...revisionSegments, ...masteredSegments];
  }, [segmentFilter, actionSegments, dueSegments, revisionSegments, masteredSegments]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;
    const duration = Number(durationDays);
    if (!startDate || !Number.isInteger(duration) || duration < 1 || duration > 365) return setError("تحقق من تاريخ البداية ومدة الخطة.");

    setSaving(true); setError(""); setSuccess("");
    const result = await client.rpc("create_quran_scheduled_plan", {
      p_student_id: studentId,
      p_title: title.trim() || `برنامج حفظ سورة ${selectedSurah.name}`,
      p_surah_number: selectedSurah.number,
      p_start_date: startDate,
      p_duration_days: duration,
      p_achievement_points: Math.max(0, Number(achievementPoints || 0)),
      p_reward_points: 0,
      p_notes: notes.trim() || null
    });
    setSaving(false);
    if (result.error) return setError(result.error.message || "تعذر إنشاء خطة الحفظ.");
    const created = result.data as ScheduledPlanResult;
    setSelectedPlanId(created.plan_id);
    setSuccess(`تم إنشاء برنامج سورة ${created.surah_name} وتقسيم ${created.total_ayahs} آية على ${created.scheduled_days} يوم حفظ.`);
    await loadData();
  }

  async function addManualSegment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !selectedPlanId) return setError("اختر خطة أولًا.");
    const from = Number(fromAyah);
    const to = Number(toAyah);
    if (from < 1 || to < from || to > manualSurah.ayahs) return setError("نطاق الآيات غير صحيح.");

    setSaving(true); setError(""); setSuccess("");
    const result = await client.rpc("teacher_add_quran_segment", {
      p_plan_id: selectedPlanId,
      p_surah_number: manualSurah.number,
      p_from_ayah: from,
      p_to_ayah: to,
      p_portion_label: `سورة ${manualSurah.name} من الآية ${from} إلى ${to}`,
      p_achievement_points: Math.max(0, Number(achievementPoints || 0)),
      p_notes: notes.trim() || null
    });
    setSaving(false);
    if (result.error) return setError(result.error.message || "تعذر إضافة المقطع.");
    setSuccess("تمت إضافة المقطع إلى برنامج الطالب.");
    await loadData();
  }

  async function deletePlan(plan: QuranPlan) {
    if (!window.confirm(`حذف خطة «${plan.title}»؟`)) return;
    const client = supabase;
    if (!client) return;
    setBusyId(plan.id); setError(""); setSuccess("");
    const result = await client.rpc("delete_quran_plan_shared", { p_plan_id: plan.id });
    setBusyId("");
    if (result.error) return setError(result.error.message || "تعذر حذف الخطة.");
    setSuccess("تم حذف خطة الحفظ.");
    await loadData();
  }

  async function deleteSegment(segment: QuranSegment) {
    if (!window.confirm("حذف هذا المقطع من الخطة؟")) return;
    const client = supabase;
    if (!client) return;
    setBusyId(segment.id); setError("");
    const result = await client.rpc("teacher_delete_quran_segment", { p_segment_id: segment.id });
    setBusyId("");
    if (result.error) return setError(result.error.message || "تعذر حذف المقطع.");
    setSuccess("تم حذف المقطع.");
    await loadData();
  }

  function renderTeacherSegment(segment: QuranSegment, index: number) {
    const requiresAction = ["memorized", "recited"].includes(segment.status);
    const isToday = segment.scheduled_date === today;
    return (
      <details className={`quran-segment-accordion teacher-segment-accordion status-${segment.status}`} key={segment.id} open={requiresAction || (segmentFilter === "due" && isToday && index === 0)}>
        <summary>
          <div className="segment-summary-main">
            <span className="segment-day-badge">{segment.day_number ? `اليوم ${segment.day_number}` : "مقطع"}</span>
            <div><strong>{segment.portion_label}</strong><small>{segment.scheduled_date ? formatDate(segment.scheduled_date) : "دون تاريخ"}</small></div>
          </div>
          <div className="segment-summary-side">
            <span className="quran-plan-status">{statusLabels[segment.status] || segment.status}</span>
            <b>{segment.achievement_points} ⭐</b>
            <span className="segment-chevron">⌄</span>
          </div>
        </summary>
        <div className="segment-accordion-body">
          {segment.readable_text && <p className="quran-readable-text">{segment.readable_text}</p>}
          {segment.notes && <p className="quran-segment-note">ملاحظة: {segment.notes}</p>}
          <div className="teacher-segment-actions">
            {requiresAction && <Link href="/teacher/quran/reviews">فتح في مركز التسميع والاعتماد</Link>}
            <button type="button" disabled={busyId === segment.id || segment.status === "mastered"} onClick={() => deleteSegment(segment)}>{segment.status === "mastered" ? "مقطع معتمد" : busyId === segment.id ? "جارٍ الحذف..." : "حذف المقطع"}</button>
          </div>
        </div>
      </details>
    );
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز إدارة الحفظ...</main>;

  return (
    <main className="quran-program-page teacher-quran-management-page teacher-role-theme teacher-page-shell">
      <header className="dashboard-header role-aware-header teacher-role-header">
        <Link className="brand" href="/teacher"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="role-header-actions">
          <span className="role-identity-badge teacher"><b>المعلم</b><small>إدارة مهنية</small></span>
          <Link className="quiet-button link-submit" href="/teacher/quran/reviews">مركز التسميع</Link>
        </div>
      </header>

      <TeacherWorkspaceNav studentId={studentId} />

      <section className="quran-program-hero teacher-management-hero role-distinct-hero">
        <div className="quran-hero-copy teacher-hero-content">
          <span className="section-label">إدارة برنامج الطالب</span>
          <h1>حفظ {studentName}</h1>
          <p>{familyName} · أنشئ الخطة وحدد الورد وتابع الحالة اليومية من مساحة واضحة ومهنية.</p>
          <div className="role-scope-strip"><span>إنشاء الخطط</span><span>تحديد الورد</span><span>متابعة المحاولات</span><span>الاعتماد والتصحيح</span></div>
        </div>
        <Link className="teacher-hero-side-card" href="/teacher/quran/reviews">
          <span>🎙️ مركز التسميع</span>
          <strong>{actionSegments.length}</strong>
          <small>محاولات تنتظر قرارك</small>
        </Link>
      </section>

      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      <section className="teacher-work-summary-grid">
        <article className="action"><span>🎙️</span><div><strong>{actionSegments.length}</strong><small>تنتظر قرارك</small></div></article>
        <article><span>📅</span><div><strong>{dueSegments.length}</strong><small>ورد مستحق</small></div></article>
        <article><span>🔄</span><div><strong>{revisionSegments.length}</strong><small>لدى الطالب للتصحيح</small></div></article>
        <article><span>✅</span><div><strong>{masteredSegments.length}</strong><small>متقنة</small></div></article>
        <article><span>🗓️</span><div><strong>{upcomingSegments.length}</strong><small>مقاطع قادمة</small></div></article>
      </section>

      <section className="quran-plan-manager-card teacher-plan-manager-card">
        <div className="teacher-section-head"><div><span className="section-label">خطط الطالب</span><h2>إدارة خطط الحفظ</h2><p>اختر الخطة لعرض وردها اليومي وحالات المقاطع.</p></div></div>
        {plans.length === 0 ? <p className="quran-text-pending">لا توجد خطط بعد.</p> : <div className="quran-plan-control-list">{plans.map((plan) => <article key={plan.id} className={selectedPlanId === plan.id ? "active" : ""}><button type="button" onClick={() => setSelectedPlanId(plan.id)}><span>📘</span><div><strong>{plan.title}</strong><small>{plan.mastered_count} من {plan.segments_count} متقنة · {plan.waiting_count} تنتظر تقييمك · {plan.revision_count} للتصحيح</small></div></button><button className="delete-plan-button" type="button" disabled={busyId === plan.id} onClick={() => deletePlan(plan)}>{busyId === plan.id ? "جارٍ الحذف..." : "حذف الخطة"}</button></article>)}</div>}
      </section>

      <details className="teacher-planning-tools-fold">
        <summary><div><span>🛠️</span><div><strong>أدوات إعداد الخطة</strong><small>إنشاء خطة جديدة أو إضافة مقطع يدوي عند الحاجة.</small></div></div><span className="segment-chevron">⌄</span></summary>
        <section className="quran-program-layout">
          <form className="quran-plan-form auth-form" onSubmit={createPlan}>
            <div><span className="section-label">خطة ذكية جديدة</span><h2>تقسيم السورة تلقائيًا</h2><p>ينشأ ورد يومي كامل وفق مدة البرنامج.</p></div>
            <label>السورة<select value={surahNumber} onChange={(event) => { const value = event.target.value; const surah = quranSurahs.find((item) => item.number === Number(value)) || quranSurahs[0]; setSurahNumber(value); setTitle(`برنامج حفظ سورة ${surah.name}`); }}>{quranSurahs.map((surah) => <option value={surah.number} key={surah.number}>{surah.number}. {surah.name} — {surah.ayahs} آية</option>)}</select></label>
            <label>اسم الخطة<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
            <div className="form-grid-two"><label>تاريخ البداية<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label><label>مدة الخطة بالأيام<input type="number" min="1" max="365" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} required /></label></div>
            <div className="quran-source-status ready"><span>🗓️</span><div><strong>معاينة التقسيم</strong><p>{selectedSurah.ayahs} آية على {preview.memorizationDays} يوم، بمعدل {preview.dailyMin}{preview.dailyMax !== preview.dailyMin ? `–${preview.dailyMax}` : ""} آيات يوميًا. النهاية {formatDate(preview.dueDate)}{preview.reviewDays > 0 ? `، ثم ${preview.reviewDays} أيام مراجعة.` : "."}</p></div></div>
            <label>نقاط الإنجاز لكل مقطع<input type="number" min="0" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} /></label>
            <label>تعليمات الحفظ<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="مثل: تكرار المقطع خمس مرات قبل التسجيل" /></label>
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ إنشاء الخطة..." : "إنشاء الخطة وتقسيمها"}</button>
          </form>

          <form className="quran-plan-form auth-form" onSubmit={addManualSegment}>
            <div><span className="section-label">إضافة اختيارية</span><h2>مقطع يدوي</h2><p>لإضافة واجب خاص خارج التقسيم التلقائي.</p></div>
            <label>الخطة<select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}><option value="">اختر الخطة</option>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.title}</option>)}</select></label>
            <label>السورة<select value={manualSurahNumber} onChange={(event) => { setManualSurahNumber(event.target.value); setFromAyah("1"); setToAyah("1"); }}>{quranSurahs.map((surah) => <option value={surah.number} key={surah.number}>{surah.number}. {surah.name}</option>)}</select></label>
            <div className="form-grid-two"><label>من الآية<input type="number" min="1" max={manualSurah.ayahs} value={fromAyah} onChange={(event) => setFromAyah(event.target.value)} /></label><label>إلى الآية<input type="number" min="1" max={manualSurah.ayahs} value={toAyah} onChange={(event) => setToAyah(event.target.value)} /></label></div>
            <button className="auth-submit" type="submit" disabled={saving || !selectedPlanId}>{saving ? "جارٍ الإضافة..." : "إضافة المقطع"}</button>
          </form>
        </section>
      </details>

      <section className="quran-plans-card quran-full-card organized-segments-card teacher-organized-segments">
        <div className="quran-card-head"><div><span className="section-label">مساحة العمل اليومية</span><h2>مقاطع الخطة المختارة</h2><p>ابدأ بما يتطلب قرارك، وبقية المقاطع مرتبة حسب حالتها.</p></div><span>{segments.length}</span></div>

        <div className="segment-filter-bar teacher-filter-bar" role="tablist" aria-label="فرز مقاطع الحفظ">
          <button className={segmentFilter === "action" ? "active" : ""} type="button" onClick={() => setSegmentFilter("action")}><span>تحتاج قرارك</span><b>{actionSegments.length}</b></button>
          <button className={segmentFilter === "due" ? "active" : ""} type="button" onClick={() => setSegmentFilter("due")}><span>الورد المستحق</span><b>{dueSegments.length}</b></button>
          <button className={segmentFilter === "revision" ? "active" : ""} type="button" onClick={() => setSegmentFilter("revision")}><span>للتصحيح</span><b>{revisionSegments.length}</b></button>
          <button className={segmentFilter === "mastered" ? "active" : ""} type="button" onClick={() => setSegmentFilter("mastered")}><span>المتقنة</span><b>{masteredSegments.length}</b></button>
          <button className={segmentFilter === "all" ? "active" : ""} type="button" onClick={() => setSegmentFilter("all")}><span>السجل</span><b>{actionSegments.length + dueSegments.length + revisionSegments.length + masteredSegments.length}</b></button>
        </div>

        {visibleSegments.length === 0 ? <div className="quran-empty-state compact"><span>✨</span><h3>لا توجد مقاطع في هذا التصنيف</h3><p>اختر تصنيفًا آخر أو افتح المقاطع القادمة.</p></div> : <div className="organized-segment-list">{visibleSegments.map(renderTeacherSegment)}</div>}

        <details className="future-segments-fold teacher-future-fold">
          <summary><div><span>🗓️</span><div><strong>المقاطع القادمة</strong><small>مطوية تلقائيًا لأنها لم تصبح مستحقة بعد.</small></div></div><b>{upcomingSegments.length}</b></summary>
          {upcomingSegments.length === 0 ? <div className="future-empty">لا توجد مقاطع مستقبلية في هذه الخطة.</div> : <div className="future-segment-list">{upcomingSegments.map((segment) => <article key={segment.id}><span className="segment-day-badge">{segment.day_number ? `اليوم ${segment.day_number}` : "مقطع"}</span><div><strong>{segment.portion_label}</strong><small>{formatDate(segment.scheduled_date)}</small></div><span className="future-lock">مجدول</span></article>)}</div>}
        </details>
      </section>
    </main>
  );
}
