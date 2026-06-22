"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StudentProfile = {
  birth_date?: string;
  gender?: string;
  grade_level?: string;
  avatar?: string;
  photo_path?: string;
};

type Student = {
  id: string;
  full_name: string;
  profile_data?: StudentProfile | null;
  photo_url?: string;
};

const avatarSymbols: Record<string, string> = {
  leaf: "🌿",
  star: "⭐",
  book: "📘",
  moon: "🌙"
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSession() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const organization = await supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", session.user.id)
        .eq("type", "family")
        .maybeSingle();

      if (!organization.data) {
        router.replace("/onboarding");
        return;
      }

      const studentResult = await supabase
        .from("students")
        .select("id, full_name, profile_data")
        .eq("organization_id", organization.data.id)
        .order("created_at", { ascending: true });

      if (studentResult.error) {
        setError(`تعذر تحميل الأبناء: ${studentResult.error.message}`);
      } else {
        const withPhotos = await Promise.all((studentResult.data || []).map(async (student) => {
          const profile = (student.profile_data || {}) as StudentProfile;
          if (!profile.photo_path) return student;
          const signed = await supabase.storage.from("child-photos").createSignedUrl(profile.photo_path, 60 * 60);
          return { ...student, photo_url: signed.data?.signedUrl || "" };
        }));
        setStudents(withPhotos);
      }

      setEmail(session.user.email || "");
      setFamilyName(organization.data.name);
      setLoading(false);
    }

    loadSession();
  }, [router]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز لوحة الأسرة...</main>;

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <button className="quiet-button" type="button" onClick={signOut}>تسجيل الخروج</button>
      </header>

      <section className="dashboard-welcome">
        <span className="section-label">لوحة الأسرة</span>
        <h1>{familyName}</h1>
        <p>{email}</p>
        {error && <p className="form-message error-message dashboard-error">{error}</p>}
      </section>

      {students.length === 0 ? (
        <section className="dashboard-empty-state">
          <div>
            <span className="empty-icon">+</span>
            <h2>أضف أول ابن أو ابنة</h2>
            <p>تم إنشاء الأسرة بنجاح. الخطوة التالية هي إضافة الأبناء وبياناتهم الأساسية.</p>
            <Link className="auth-submit link-submit" href="/children/new">إضافة ابن أو ابنة</Link>
          </div>
        </section>
      ) : (
        <section className="children-section">
          <div className="children-section-head">
            <div><span className="section-label">الأبناء</span><h2>أفراد الأسرة</h2></div>
            <Link className="quiet-button link-submit" href="/children/new">إضافة ابن أو ابنة</Link>
          </div>

          <div className="children-grid">
            {students.map((student) => {
              const profile = student.profile_data || {};
              return (
                <Link className="child-card child-card-link" href={`/children/${student.id}`} key={student.id}>
                  <span className="child-avatar child-avatar-photo">
                    {student.photo_url ? <img src={student.photo_url} alt={`صورة ${student.full_name}`} /> : avatarSymbols[profile.avatar || ""] || student.full_name.slice(0, 1)}
                  </span>
                  <h3>{student.full_name}</h3>
                  <p>{profile.grade_level || "أكمل بيانات الصف الدراسي"}</p>
                  <span className="child-card-action">عرض الملف ←</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
