"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TeacherWorkspaceNav from "./TeacherWorkspaceNav";

type TeacherStudent = {
  student_id: string;
  student_name: string;
  family_name: string;
  active_plans: number;
  waiting_segments: number;
  mastered_segments: number;
};

type TeacherPlan = {
  plan_id: string;
  title: string;
  student_id: string;
  student_name: string;
  family_name: string;
  status: string;
  daily_target: number;
  segments_count: number;
  mastered_count: number;
  has_points: boolean;
};

type PortalAccess = { teacher?: boolean; family?: boolean };

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [teacherCode, setTeacherCode] = useState("");
  const [hasFamilyPortal, setHasFamilyPortal] = useState(false);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [plans, setPlans] = useState<TeacherPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const waitingCount = useMemo(
    () => students.reduce((sum, student) => sum + Number(student.waiting_segments || 0), 0),
    [students]
  );

  const masteredCount = useMemo(
    () => students.reduce((sum, student) => sum + Number(student.mastered_segments || 0), 0),
    [students]
  );

  async function loadData() {
    const client = supabase;
    if (!client) return;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login?type=teacher");
      return;
    }

    const [accessResult, codeResult, studentsResult, plansResult] = await Promise.all([
      client.rpc("get_my_portal_access"),
      client.rpc("get_teacher_code"),
      client.rpc("get_teacher_students"),
      client.rpc("get_teacher_quran_plans")
    ]);

    const access = (accessResult.data || {}) as PortalAccess;
    if (!access.teacher) {
      router.replace(access.family ? "/dashboard" : "/onboarding");
      return;
    }

    setHasFamilyPortal(Boolean(access.family));
    if (codeResult.error) setError("تعذر تحميل رمز المعلم.");
    else setTeacherCode(String(codeResult.data || ""));
    if (!studentsResult.error) setStudents((studentsResult.data || []) as TeacherStudent[]);
    if (!plansResult.error) setPlans((plansResult.data || []) as TeacherPlan[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function copyTeacherCode() {
    if (!teacherCode) return;
    try {
      await window.navigator.clipboard.writeText(teacherCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("تعذر نسخ الرمز تلقائيًا. يمكنك تحديده ونسخه يدويًا.");
    }
  }

  async function deletePlan(plan: TeacherPlan) {
    const confirmed = window.confirm(`حذف خطة «${plan.title}» للطالب ${plan.student_name}؟\n\nسيتم حذف جميع مقاطعها ومحاولاتها، وإرجاع نقاط القرآن المحتسبة منها حتى تبدأ بخطة جديدة.`);
    if (!confirmed) return;

    const client = supabase;
    if (!client) return;
    setBusyPlanId(plan.plan_id);
    setError("");
    setSuccess("");
    const result = await client.rpc("delete_quran_plan_shared", { p_plan_id: plan.plan_id });
    setBusyPlanId("");

    if (result.error) {
      setError(result.error.message || "تعذر حذف خطة الحفظ.");
      return;
    }

    setSuccess("تم حذف الخطة وإعادة نقاطها، ويمكن إنشاء خطة جديدة الآن.");
    await loadData();
  }

  async function signOut() {
    const client = supabase;
    if (client) await client.auth.signOut();
    router.replace("/login?type=teacher");
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز حساب المعلم...</main>;

  return (
    <main className="teacher-dashboard-page teacher-role-theme teacher-page-shell">
      <header className="dashboard-header role-aware-header teacher-role-header">
        <Link className="brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="role-header-actions">
          <span className="role-identity-badge teacher"><b>المعلم</b><small>إدارة مهنية</small></span>
          {hasFamilyPortal && <Link className="quiet-button link-submit teacher-family-switch" href="/dashboard">حساب ولي الأمر</Link>}
          <button className="quiet-button" type="button" onClick={signOut}>تسجيل الخروج</button>
        </div>
      </header>

      <TeacherWorkspaceNav />

      <section className="teacher-hero teacher-dashboard-hero">
        <div className="teacher-hero-content">
          <span className="section-label">المساحة المهنية للمعلم</span>
          <h1>إدارة الحفظ والتسميع</h1>
          <p>مساحة واحدة مرتبة لإنشاء الخطط، متابعة الطلاب، مراجعة التسجيلات، واعتماد الإتقان بوضوح وسرعة.</p>
          <div className="teacher-hero-actions">
            <Link className="primary" href="/teacher/quran/reviews"><span>🎙️</span>فتح مركز التسميع</Link>
            <Link className="secondary" href="#teacher-students"><span>👥</span>عرض الطلاب</Link>
            {hasFamilyPortal && <Link className="secondary" href="/children/new"><span>➕</span>إضافة ابن أو ابنة</Link>}
          </div>
        </div>

        <div className={`teacher-code-card ${teacherCode ? "ready" : "missing"}`}>
          <span>رمز المعلم</span>
          <strong>{teacherCode || "غير متوفر"}</strong>
          <small>{teacherCode ? "شاركه مع ولي الأمر لتفويضك بالطالب" : "أكمل إعداد حساب المعلم لإصدار الرمز"}</small>
          {teacherCode ? (
            <button className={`teacher-code-copy ${copied ? "copied" : ""}`} type="button" onClick={copyTeacherCode}>
              {copied ? "✓ تم نسخ الرمز" : "نسخ الرمز"}
            </button>
          ) : (
            <Link className="teacher-code-setup" href="/onboarding">إكمال إعداد الحساب</Link>
          )}
        </div>
      </section>

      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      {hasFamilyPortal && (
        <section className="teacher-family-access-card">
          <span>👨‍👩‍👧‍👦</span>
          <div><strong>حساب ولي الأمر متاح أيضًا</strong><p>يمكنك إضافة أبنائك من لوحة الأسرة كما كان سابقًا، ثم العودة إلى لوحة المعلم دون إنشاء حساب جديد.</p></div>
          <div className="teacher-family-access-actions"><Link href="/children/new">إضافة طفل</Link><Link href="/dashboard">فتح لوحة الأسرة</Link></div>
        </section>
      )}

      <section className="teacher-authority-note">
        <span>🛡️</span>
        <div>
          <strong>صلاحية مهنية واضحة</strong>
          <p>أنت المسؤول عن خطة الحفظ والتقييم والاعتماد والتصحيح، بينما يطّلع ولي الأمر على التقدم والنتائج فقط.</p>
        </div>
      </section>

      <section className="teacher-dashboard-overview" aria-label="ملخص حساب المعلم">
        <Link className="review-cta" href="/teacher/quran/reviews">
          <span className="metric-icon">🎙️</span>
          <div><strong>{waitingCount}</strong><small>محاولات تنتظر قرارك</small></div>
        </Link>
        <article><span className="metric-icon">👥</span><div><strong>{students.length}</strong><small>طلاب مرتبطون</small></div></article>
        <article><span className="metric-icon">📘</span><div><strong>{plans.length}</strong><small>خطط حفظ مرتبطة</small></div></article>
        <article><span className="metric-icon">✅</span><div><strong>{masteredCount}</strong><small>مقاطع متقنة</small></div></article>
      </section>

      <section className="teacher-students-section" id="teacher-students">
        <div className="teacher-section-head">
          <div><span className="section-label">طلابي</span><h2>الطلاب المرتبطون</h2><p>اختر الطالب للوصول إلى خطته اليومية أو فتح مركز التسميع.</p></div>
        </div>

        {students.length === 0 ? (
          <div className="teacher-empty"><span>🔗</span><h3>لا يوجد طلاب مرتبطون بعد</h3><p>انسخ رمز المعلم واطلب من ولي الأمر إدخاله في صفحة «تفويض المعلم» الخاصة بالطفل.</p></div>
        ) : (
          <div className="teacher-students-grid">
            {students.map((student) => (
              <article key={student.student_id} className="teacher-student-management-card">
                <div className="teacher-student-card-head">
                  <span className="teacher-student-avatar">{student.student_name.trim().slice(0, 1)}</span>
                  <div><h3>{student.student_name}</h3><p>{student.family_name}</p></div>
                </div>

                <div className="teacher-student-stats">
                  <span><strong>{student.active_plans}</strong><small>خطط نشطة</small></span>
                  <span><strong>{student.waiting_segments}</strong><small>تنتظر التقييم</small></span>
                  <span><strong>{student.mastered_segments}</strong><small>متقنة</small></span>
                </div>

                <div className="teacher-student-actions">
                  <Link href={`/teacher/students/${student.student_id}/quran`}>إدارة برنامج الحفظ</Link>
                  <Link href="/teacher/quran/reviews">فتح مركز التسميع</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="teacher-students-section quran-plan-control-section">
        <div className="teacher-section-head">
          <div><span className="section-label">إدارة الحفظ</span><h2>خطط الحفظ المرتبطة</h2><p>يمكن حذف أي خطة تجريبية وإعادة نقاطها، ثم إنشاء خطة جديدة من الصفر.</p></div>
        </div>

        {plans.length === 0 ? (
          <div className="teacher-empty compact"><span>📖</span><h3>لا توجد خطط حفظ</h3><p>اختر أحد الطلاب وأنشئ له أول خطة حفظ.</p></div>
        ) : (
          <div className="quran-plan-control-list">
            {plans.map((plan) => {
              const progress = plan.segments_count ? Math.round((plan.mastered_count / plan.segments_count) * 100) : 0;
              return (
                <article className="teacher-plan-row" key={plan.plan_id}>
                  <div className="teacher-plan-main">
                    <span className="teacher-plan-icon">📘</span>
                    <div className="teacher-plan-copy">
                      <strong>{plan.title}</strong>
                      <small>{plan.student_name} · {plan.family_name} · {plan.segments_count} مقاطع</small>
                      <div className="teacher-plan-progress">
                        <div className="teacher-plan-progress-head"><span>التقدم</span><b>{progress}%</b></div>
                        <div className="teacher-plan-progress-track"><span style={{ width: `${progress}%` }} /></div>
                      </div>
                    </div>
                  </div>

                  <div className="teacher-plan-actions">
                    <Link href={`/teacher/students/${plan.student_id}/quran`}>إدارة الخطة</Link>
                    <button type="button" disabled={busyPlanId === plan.plan_id} onClick={() => deletePlan(plan)}>
                      {busyPlanId === plan.plan_id ? "جارٍ الحذف..." : "حذف والبدء من جديد"}
                    </button>
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
