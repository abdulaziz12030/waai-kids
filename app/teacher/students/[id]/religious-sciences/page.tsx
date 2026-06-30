"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MemorizationPlanBuilder from "../../../../components/MemorizationPlanBuilder";
import { supabase } from "../../../../../lib/supabase";
import TeacherWorkspaceNav from "../../../TeacherWorkspaceNav";

type PortalAccess = { teacher?: boolean; family?: boolean };

type TeacherStudent = {
  student_id: string;
  student_name: string;
  family_name: string;
};

export default function TeacherReligiousSciencesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [studentName, setStudentName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    async function load() {
      const client = supabase;
      if (!client) return;
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) return router.replace("/login?type=teacher");

      const [accessResult, studentsResult] = await Promise.all([
        client.rpc("get_my_portal_access"),
        client.rpc("get_teacher_students")
      ]);
      const access = (accessResult.data || {}) as PortalAccess;
      if (!access.teacher) return router.replace(access.family ? "/dashboard" : "/onboarding");

      const student = ((studentsResult.data || []) as TeacherStudent[]).find((item) => item.student_id === studentId);
      if (!student) return router.replace("/teacher");
      setStudentName(student.student_name);
      setFamilyName(student.family_name);
      setLoading(false);
    }
    load();
  }, [router, studentId]);

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز مكتبة العلوم الدينية...</main>;

  return (
    <main className="quran-program-page teacher-quran-management-page">
      <header className="dashboard-header role-aware-header teacher-role-header">
        <Link className="brand" href="/teacher"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="role-header-actions">
          <span className="role-identity-badge teacher"><b>المعلم</b><small>العلوم الدينية</small></span>
          <Link className="quiet-button link-submit" href={`/teacher/students/${studentId}/quran`}>إدارة القرآن</Link>
        </div>
      </header>

      <TeacherWorkspaceNav studentId={studentId} />

      <section className="quran-program-hero role-distinct-hero teacher-management-hero">
        <div className="quran-hero-copy">
          <span className="section-label">📚 مكتبة العلوم الدينية</span>
          <h1>متون {studentName}</h1>
          <p>{familyName} · اختر متنًا مناسبًا، وحدد مدة البرنامج، وسيُقسّم إلى مقاطع يومية مرتبطة بهدف تعليمي.</p>
          <div className="role-scope-strip"><span>اختيار المتن</span><span>تقسيم الأيام</span><span>تسجيل التسميع</span><span>اعتماد الإتقان</span></div>
        </div>
        <div className="quran-hero-icon">📜</div>
      </section>

      {createdCount > 0 && <p className="form-message success-message">تمت إضافة البرنامج، وسيظهر ضمن خطط الطالب وصفحة الحفظ.</p>}

      <MemorizationPlanBuilder
        studentId={studentId}
        role="teacher"
        studentName={studentName}
        showQuran={false}
        onCreated={() => setCreatedCount((count) => count + 1)}
      />

      <section className="quran-plan-manager-card">
        <div><span className="section-label">بعد إنشاء البرنامج</span><h2>متابعة موحدة مع القرآن</h2></div>
        <p className="quran-text-pending">تظهر برامج المتون في صفحة إدارة الحفظ نفسها، وتنتقل تسجيلات الطفل إلى مركز التسميع مثل مقاطع القرآن.</p>
        <Link className="auth-submit link-submit" href={`/teacher/students/${studentId}/quran`}>الانتقال إلى إدارة البرامج</Link>
      </section>
    </main>
  );
}
