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
      const client = supabase;
      if (!client) {
        router.replace("/login");
        return;
      }

      const { data } = await client.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const organization = await client
        .from("organizations")
        .select("id, name")
        .eq("owner_id", session.user.id)
        .eq("type", "family")
        .maybeSingle();

      if (!organization.data) {
        router.replace("/onboarding");
        return;
      }

      const studentResult = await client
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
          const signed = await client.storage.from("child-photos").createSignedUrl(profile.photo_path, 60 * 60);
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
    const client = supabase;
    if (client) await client.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز لوحة الأسرة...</main>;

  return (
    <main className="dashboard-page dashboard-page-v2">
      <header className="dashboard-header">
        <Link className="brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <button className="quiet-button" type="button" onClick={signOut}>تسجيل الخروج</button>
      </header>

      <section className="dashboard-welcome dashboard-welcome-v2">
        <div>
          <span className="section-label">لوحة الأسرة</span>
          <h1>{familyName}</h1>
          <p>{email}</p>
        </div>
        <Link className="auth-submit link-submit dashboard-primary-action" href="/children/new">إضافة ابن أو ابنة</Link>
        {error && <p className="form-message error-message dashboard-error">{error}</p>}
      </section>

      <section className="family-metrics" aria-label="ملخص الأسرة">
        <article><span>عدد الأبناء</span><strong>{students.length}</strong><small>ملفات مضافة</small></article>
        <article><span>مجموع النقاط</span><strong>0</strong><small>يُفعّل مع نظام النقاط</small></article>
        <article><span>الأهداف النشطة</span><strong>0</strong><small>المرحلة التالية</small></article>
        <article><span>المهام المنتظرة</span><strong>0</strong><small>لا توجد مهام بعد</small></article>
        <article><span>المكافآت المستحقة</span><strong>0</strong><small>لا توجد مكافآت بعد</small></article>
        <article><span>تقدم القرآن</span><strong>—</strong><small>لم تبدأ خطة بعد</small></article>
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
        <section className="children-section children-section-v2">
          <div className="children-section-head">
            <div><span className="section-label">الأبناء</span><h2>أفراد الأسرة</h2><p>بطاقة مختصرة لكل طفل، وستتحدث تلقائيًا مع الأهداف والمهام والقرآن.</p></div>
          </div>

          <div className="children-grid children-grid-v2">
            {students.map((student) => {
              const profile = student.profile_data || {};
              return (
                <Link className="child-card child-card-link child-card-summary" href={`/children/${student.id}`} key={student.id}>
                  <div className="child-card-top">
                    <span className="child-avatar child-avatar-photo">
                      {student.photo_url ? <img src={student.photo_url} alt={`صورة ${student.full_name}`} /> : avatarSymbols[profile.avatar || ""] || student.full_name.slice(0, 1)}
                    </span>
                    <div><h3>{student.full_name}</h3><p>{profile.grade_level || "الصف غير محدد"}</p></div>
                  </div>
                  <div className="child-mini-stats">
                    <span><small>النقاط</small><strong>0</strong></span>
                    <span><small>الهدف الحالي</small><strong>لا يوجد</strong></span>
                    <span><small>آخر مهمة</small><strong>لا توجد</strong></span>
                    <span><small>القرآن</small><strong>لم يبدأ</strong></span>
                  </div>
                  <span className="child-card-action">فتح ملف الطفل ←</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="weekly-report-card">
        <div><span className="section-label">التقرير الأسبوعي</span><h2>ملخص هذا الأسبوع</h2><p>ستظهر هنا النقاط والمهام والأهداف والإنجاز القرآني بعد تفعيل المراحل القادمة.</p></div>
        <div className="weekly-report-placeholder"><strong>لا توجد بيانات بعد</strong><span>ابدأ بإنشاء أول هدف للطفل في المرحلة التالية.</span></div>
      </section>
    </main>
  );
}
