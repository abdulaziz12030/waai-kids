"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type TeacherLink = {
  id: string;
  teacher_user_id: string;
  teacher_name: string;
  status: string;
};

export default function ChildTeacherPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [studentName, setStudentName] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [links, setLinks] = useState<TeacherLink[]>([]);
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

    const [studentResult, linksResult] = await Promise.all([
      client.from("students").select("full_name").eq("id", studentId).maybeSingle(),
      client.rpc("get_student_teacher_links", { p_student_id: studentId })
    ]);

    if (studentResult.data) setStudentName(studentResult.data.full_name);
    if (!linksResult.error) setLinks((linksResult.data || []) as TeacherLink[]);
    else setError("تعذر تحميل بيانات المعلم.");
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function linkTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;

    setSaving(true);
    setError("");
    setSuccess("");
    const result = await client.rpc("link_teacher_to_student", {
      p_student_id: studentId,
      p_teacher_code: teacherCode.trim().toUpperCase()
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message.includes("رمز المعلم") ? "رمز المعلم غير صحيح." : "تعذر ربط المعلم الآن.");
      return;
    }

    setTeacherCode("");
    setSuccess(`تم ربط ${String(result.data || "المعلم")} بالطالب.`);
    await loadData();
  }

  async function unlinkTeacher(linkId: string) {
    const client = supabase;
    if (!client) return;
    setError("");
    const result = await client.rpc("unlink_teacher_from_student", { p_link_id: linkId });
    if (result.error) {
      setError("تعذر إلغاء ربط المعلم.");
      return;
    }
    setSuccess("تم إلغاء ربط المعلم بالطالب.");
    await loadData();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل إعدادات المعلم...</main>;

  return (
    <main className="child-teacher-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>

      <section className="teacher-link-hero">
        <div><span className="section-label">ربط المعلم</span><h1>معلم {studentName || "الطالب"}</h1><p>أدخل رمز المعلم ليتمكن من رؤية خطط الحفظ ومقاطع التسميع الخاصة بهذا الطالب فقط.</p></div>
        <span className="teacher-link-icon">👨‍🏫</span>
      </section>

      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      <section className="teacher-link-layout">
        <form className="teacher-link-form auth-form" onSubmit={linkTeacher}>
          <div><span className="section-label">إضافة معلم</span><h2>رمز المعلم</h2><p>يظهر الرمز داخل لوحة حساب المعلم.</p></div>
          <label>رمز المعلم<input value={teacherCode} onChange={(event) => setTeacherCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={10} placeholder="مثال: A1B2C3D4E5" required /></label>
          <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الربط..." : "ربط المعلم بالطالب"}</button>
        </form>

        <section className="linked-teachers-card">
          <div><span className="section-label">المعلمون</span><h2>المعلمون المرتبطون</h2></div>
          {links.length === 0 ? (
            <div className="teacher-empty compact"><span>🔗</span><strong>لا يوجد معلم مرتبط</strong><p>أدخل رمز المعلم من النموذج المجاور.</p></div>
          ) : (
            <div className="linked-teachers-list">
              {links.map((link) => (
                <article key={link.id}><div><span>👨‍🏫</span><strong>{link.teacher_name}</strong><small>{link.status === "active" ? "مرتبط ونشط" : link.status}</small></div><button type="button" onClick={() => unlinkTeacher(link.id)}>إلغاء الربط</button></article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
