"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [plans, setPlans] = useState<TeacherPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    if (codeResult.error) setError("تعذر تحميل رمز المعلم.");
    else setTeacherCode(String(codeResult.data || ""));
    if (!studentsResult.error) setStudents((studentsResult.data || []) as TeacherStudent[]);
    if (!plansResult.error) setPlans((plansResult.data || []) as TeacherPlan[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function deletePlan(plan: TeacherPlan) {
    const confirmed = window.confirm(`حذف خطة "${plan.title}" للطالب ${plan.student_name}؟ سيتم حذف المقاطع التابعة لها إذا لم تُحتسب نقاطها.`);
    if (!confirmed) return;

    const client = supabase;
    if (!client) return;
    setBusyPlanId(plan.plan_id);
    setError("");
    setSuccess("");
    const result = await client.rpc("delete_quran_plan_shared", { p_plan_id: plan.plan_id });
    setBusyPlanId("");

    if (result.error) {
      setError(result.error.message.includes("نقاط") ? "لا يمكن حذف خطة احتُسبت نقاط أحد مقاطعها." : result.error.message || "تعذر حذف خطة الحفظ.");
      return;
    }

    setSuccess("تم حذف خطة الحفظ ومقاطعها التابعة.");
    await loadData();
  }

  async function signOut() {
    const client = supabase;
    if (client) await client.auth.signOut();
    router.replace("/login?type=teacher");
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز حساب المعلم...</main>;

  return (
    <main className="teacher-dashboard-page">
      <header className="dashboard-header">
        <Link className="brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <button className="quiet-button" type="button" onClick={signOut}>تسجيل الخروج</button>
      </header>

      <section className="teacher-hero">
        <div><span className="section-label">الحساب المهني للمعلم</span><h1>إدارة الحفظ والتسميع</h1><p>أنشئ خطط الحفظ، تابع الطلاب، قيّم التسجيلات، واعتمد الإتقان أو أعد المقطع للتصحيح.</p></div>
        <div className="teacher-code-card"><span>رمز المعلم</span><strong>{teacherCode || "—"}</strong><small>يرسله المعلم لولي الأمر لتفويضه بمتابعة الطالب</small></div>
      </section>

      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      <section className="teacher-authority-note">
        <span>🛡️</span><div><strong>صلاحيتك المهنية</strong><p>المعلم هو المسؤول عن إنشاء الخطة، تحديد الورد، تقييم الأخطاء والطلاقة والتجويد، اعتماد الإتقان، وإعادة المقطع للتصحيح. ولي الأمر يشاهد النتائج ويتابع التقدم فقط.</p></div>
      </section>

      <section className="teacher-actions-grid">
        <Link href="/teacher/quran/reviews"><span>🎙️</span><strong>مركز التسميع والاعتماد</strong><small>خاص بالمعلم لتقييم التسجيلات واتخاذ القرار</small></Link>
        <article><span>👥</span><strong>{students.length}</strong><small>طلاب مرتبطون</small></article>
        <article><span>⏳</span><strong>{students.reduce((sum, student) => sum + Number(student.waiting_segments || 0), 0)}</strong><small>محاولات تنتظر تقييمك</small></article>
      </section>

      <section className="teacher-students-section">
        <div className="teacher-section-head"><div><span className="section-label">طلابي</span><h2>الطلاب المرتبطون</h2><p>اختر الطالب لإدارة برنامج الحفظ الخاص به.</p></div></div>
        {students.length === 0 ? (
          <div className="teacher-empty"><span>🔗</span><h3>لا يوجد طلاب مرتبطون بعد</h3><p>شارك رمز المعلم مع ولي الأمر، وبعد موافقته سيظهر الطالب هنا.</p></div>
        ) : (
          <div className="teacher-students-grid">
            {students.map((student) => (
              <article key={student.student_id} className="teacher-student-management-card">
                <div><span>🧒</span><h3>{student.student_name}</h3><p>{student.family_name}</p></div>
                <div className="teacher-student-stats"><span><strong>{student.active_plans}</strong><small>خطط نشطة</small></span><span><strong>{student.waiting_segments}</strong><small>تنتظر التقييم</small></span><span><strong>{student.mastered_segments}</strong><small>متقنة</small></span></div>
                <div className="teacher-student-actions"><Link href={`/teacher/students/${student.student_id}/quran`}>إدارة برنامج الحفظ</Link><Link href="/teacher/quran/reviews">فتح مركز التسميع</Link></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="teacher-students-section quran-plan-control-section">
        <div className="teacher-section-head"><div><span className="section-label">إدارة الحفظ</span><h2>خطط الحفظ المرتبطة</h2></div></div>
        {plans.length === 0 ? (
          <div className="teacher-empty compact"><span>📖</span><h3>لا توجد خطط حفظ</h3><p>اختر أحد الطلاب وأنشئ له أول خطة حفظ.</p></div>
        ) : (
          <div className="quran-plan-control-list">
            {plans.map((plan) => (
              <article key={plan.plan_id}>
                <div><span>📘</span><div><strong>{plan.title}</strong><small>{plan.student_name} · {plan.family_name} · {plan.segments_count} مقاطع · {plan.mastered_count} متقنة</small></div></div>
                <div className="teacher-plan-actions"><Link href={`/teacher/students/${plan.student_id}/quran`}>إدارة الخطة</Link><button type="button" disabled={busyPlanId === plan.plan_id || plan.has_points} onClick={() => deletePlan(plan)}>{plan.has_points ? "احتُسبت نقاط" : busyPlanId === plan.plan_id ? "جارٍ الحذف..." : "حذف الخطة"}</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
