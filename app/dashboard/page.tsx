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
  achievement_points?: number;
  reward_points?: number;
  profile_data?: StudentProfile | null;
  photo_url?: string;
};

type DashboardMetrics = {
  activeGoals: number;
  pendingTasks: number;
  totalPoints: number;
};

type ChildDeleteResult = {
  photo_path?: string | null;
};

const avatarSymbols: Record<string, string> = {
  leaf: "🌿",
  star: "⭐",
  book: "📘",
  moon: "🌙"
};

function getProfileCompletion(student: Student): number {
  const profile = student.profile_data || {};
  const checks = [
    student.full_name.trim().length >= 2,
    Boolean(profile.birth_date),
    Boolean(profile.gender),
    Boolean(profile.grade_level),
    Boolean(profile.avatar || profile.photo_path)
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ activeGoals: 0, pendingTasks: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDashboard() {
    const client = supabase;
    if (!client) {
      router.replace("/login?type=family");
      return;
    }

    setLoading(true);
    setError("");

    const { data } = await client.auth.getSession();
    const session = data.session;
    if (!session) {
      router.replace("/login?type=family");
      return;
    }

    const organization = await client
      .from("organizations")
      .select("id, name, family_title")
      .eq("owner_id", session.user.id)
      .eq("type", "family")
      .maybeSingle();

    if (!organization.data) {
      router.replace("/onboarding");
      return;
    }

    const [studentResult, goalsResult, tasksResult] = await Promise.all([
      client
        .from("students")
        .select("id, full_name, achievement_points, reward_points, profile_data")
        .eq("organization_id", organization.data.id)
        .order("created_at", { ascending: true }),
      client
        .from("goals")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.data.id)
        .in("status", ["approved", "active", "paused"]),
      client
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.data.id)
        .eq("status", "submitted")
    ]);

    if (studentResult.error) {
      setError("تعذر تحميل بيانات الأبناء.");
    } else {
      const withPhotos = await Promise.all((studentResult.data || []).map(async (student) => {
        const profile = (student.profile_data || {}) as StudentProfile;
        if (!profile.photo_path) return student;
        const signed = await client.storage.from("child-photos").createSignedUrl(profile.photo_path, 3600);
        return { ...student, photo_url: signed.data?.signedUrl || "" };
      }));
      setStudents(withPhotos);
      setMetrics({
        activeGoals: goalsResult.count || 0,
        pendingTasks: tasksResult.count || 0,
        totalPoints: withPhotos.reduce((sum, student) => sum + Number(student.achievement_points || 0), 0)
      });
    }

    setEmail(session.user.email || "");
    setFamilyName(organization.data.family_title || organization.data.name);
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, [router]);

  async function signOut() {
    const client = supabase;
    if (client) await client.auth.signOut();
    router.replace("/login?type=family");
    router.refresh();
  }

  async function deleteChild(student: Student) {
    const client = supabase;
    if (!client || deletingId) return;

    const warning = [
      `سيتم حذف ملف ${student.full_name} نهائيًا.`,
      "يشمل الحذف الأهداف والمهام وخطط الحفظ والنقاط والهدايا والروابط والجلسات المرتبطة بالطفل.",
      "لا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟"
    ].join("\n");

    if (!window.confirm(warning)) return;

    const confirmation = window.prompt(
      `للتأكيد اكتب اسم الطفل كما يظهر تمامًا:\n${student.full_name}`,
      ""
    );

    if (confirmation?.trim() !== student.full_name.trim()) {
      setError("لم يتم الحذف لأن اسم الطفل المكتوب لا يطابق الاسم الظاهر.");
      setSuccess("");
      return;
    }

    setDeletingId(student.id);
    setError("");
    setSuccess("");

    const result = await client.rpc("parent_delete_child", {
      p_student_id: student.id,
      p_confirmation: confirmation.trim()
    });

    if (result.error) {
      setDeletingId("");
      if (result.error.message.includes("CONFIRMATION_MISMATCH")) {
        setError("لم يتم الحذف لأن اسم الطفل المكتوب غير مطابق.");
      } else if (result.error.message.includes("CHILD_DELETE_FORBIDDEN")) {
        setError("لا تملك صلاحية حذف هذا الطفل.");
      } else {
        setError("تعذر حذف ملف الطفل الآن. حاول مرة أخرى.");
      }
      return;
    }

    const deleted = (result.data || {}) as ChildDeleteResult;
    if (deleted.photo_path) {
      await client.storage.from("child-photos").remove([deleted.photo_path]);
    }

    setSuccess(`تم حذف ملف ${student.full_name} وجميع البيانات المرتبطة به.`);
    setDeletingId("");
    await loadDashboard();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز لوحة الأسرة...</main>;

  return (
    <main className="dashboard-page dashboard-page-v2 parent-dashboard-refresh">
      <header className="dashboard-header">
        <Link className="brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="dashboard-header-actions">
          <span className="role-identity-badge parent"><b>ولي الأمر</b><small>متابعة وإشراف</small></span>
          <Link className="quiet-button link-submit" href="/settings/family">إعدادات الأسرة</Link>
          <button className="quiet-button" type="button" onClick={signOut}>تسجيل الخروج</button>
        </div>
      </header>

      <section className="dashboard-welcome dashboard-welcome-v2 parent-welcome-card">
        <div>
          <span className="section-label">لوحة ولي الأمر</span>
          <h1>مرحبًا بك في {familyName}</h1>
          <p>{email}</p>
        </div>
        <div className="dashboard-welcome-actions">
          <Link className="quiet-button link-submit" href="/settings/family">تعديل ملف الأسرة</Link>
          <Link className="auth-submit link-submit dashboard-primary-action" href="/children/new">+ إضافة طفل</Link>
        </div>
        {error && <p className="form-message error-message dashboard-error">{error}</p>}
        {success && <p className="form-message success-message dashboard-error">{success}</p>}
      </section>

      <section className="family-metrics focused-metrics" aria-label="ملخص الأسرة">
        <article className="metric-card metric-children"><span className="metric-icon">👨‍👩‍👧‍👦</span><div><span>الأبناء</span><strong>{students.length}</strong><small>ملفات مضافة</small></div></article>
        <article className="metric-card metric-review"><span className="metric-icon">✅</span><div><span>تنتظر المتابعة</span><strong>{metrics.pendingTasks}</strong><small>مهام أرسلها الأبناء</small></div></article>
        <article className="metric-card metric-goals"><span className="metric-icon">🎯</span><div><span>أهداف نشطة</span><strong>{metrics.activeGoals}</strong><small>قيد التقدم</small></div></article>
        <article className="metric-card metric-points"><span className="metric-icon">⭐</span><div><span>نقاط الإنجاز</span><strong>{metrics.totalPoints}</strong><small>مجموع الأسرة</small></div></article>
      </section>

      {students.length === 0 ? (
        <section className="dashboard-empty-state">
          <div><span className="empty-icon">👋</span><h2>ابدأ بإضافة أول طفل</h2><p>بعد الإضافة ستتمكن من متابعة الأهداف والمهام وبرامج الحفظ.</p><Link className="auth-submit link-submit" href="/children/new">إضافة طفل</Link></div>
        </section>
      ) : (
        <section className="children-section children-section-v2">
          <div className="children-section-head"><div><span className="section-label">الأبناء</span><h2>اختر الطفل الذي تريد متابعته</h2><p>الأهداف والمهام والهدايا ومتابعة الحفظ ودخول الطفل في مكان واحد.</p></div></div>
          <div className="children-grid children-grid-v2 refreshed-children-grid">
            {students.map((student, index) => {
              const profile = student.profile_data || {};
              const completion = getProfileCompletion(student);
              const icon = index % 4 === 0 ? "🌟" : index % 4 === 1 ? "🚀" : index % 4 === 2 ? "📚" : "🌈";
              const deleting = deletingId === student.id;
              return (
                <article className="child-card child-card-summary refreshed-child-card" key={student.id}>
                  <Link className="child-card-main-link" href={`/children/${student.id}`}>
                    <div className="child-card-top">
                      <span className="child-avatar child-avatar-photo">{student.photo_url ? <img src={student.photo_url} alt={`صورة ${student.full_name}`} /> : avatarSymbols[profile.avatar || ""] || student.full_name.slice(0, 1)}</span>
                      <div><span className="child-color-icon">{icon}</span><h3>{student.full_name}</h3><p>{profile.grade_level || "الصف غير محدد"}</p></div>
                    </div>
                    <div className="progress-row"><div className="progress-row-head"><span>اكتمال الملف</span><strong>{completion}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${completion}%` }} /></div></div>
                    <div className="child-points-row"><div className="child-points-pill"><span>⭐</span><strong>{student.achievement_points || 0}</strong><small>إنجاز</small></div><div className="child-points-pill reward"><span>💎</span><strong>{student.reward_points || 0}</strong><small>مكافآت</small></div></div>
                  </Link>
                  <div className="child-quick-actions" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))" }}>
                    <Link href={`/children/${student.id}/goals`}><span>🎯</span>الأهداف</Link>
                    <Link href={`/children/${student.id}/tasks`}><span>✅</span>المهام</Link>
                    <Link href={`/children/${student.id}/gifts`}><span>🎁</span>الهدايا</Link>
                    <Link href={`/children/${student.id}/quran`}><span>📖</span>متابعة الحفظ</Link>
                    <Link href={`/children/${student.id}/access`}><span>🔐</span>الدخول</Link>
                    <button
                      className="child-delete-action"
                      type="button"
                      disabled={Boolean(deletingId)}
                      onClick={() => void deleteChild(student)}
                    >
                      <span>🗑️</span>{deleting ? "جارٍ الحذف..." : "حذف الطفل"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="weekly-report-card simplified-report-card">
        <div><span className="section-label">اقتراح اليوم</span><h2>تابع برنامج الحفظ</h2><p>اختر أحد الأبناء ثم افتح «متابعة الحفظ» للاطلاع على الخطة ونتائج المعلم.</p></div>
        <div className="weekly-report-placeholder"><strong>📖</strong><span>متابعة الحفظ والنتائج</span></div>
      </section>
    </main>
  );
}
