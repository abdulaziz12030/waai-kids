"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const avatarSymbols: Record<string, string> = {
  leaf: "🌿",
  star: "⭐",
  book: "📘",
  moon: "🌙"
};

const avatars = [
  { key: "leaf", label: "ورقة", symbol: "🌿" },
  { key: "star", label: "نجمة", symbol: "⭐" },
  { key: "book", label: "كتاب", symbol: "📘" },
  { key: "moon", label: "هلال", symbol: "🌙" }
];

type ProfileData = {
  birth_date?: string;
  gender?: string;
  grade_level?: string;
  avatar?: string;
};

export default function ChildProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [avatar, setAvatar] = useState("leaf");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadChild() {
      if (!supabase) {
        setError("تعذر الاتصال بالخدمة.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const organization = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .eq("type", "family")
        .maybeSingle();

      if (!organization.data) {
        router.replace("/onboarding");
        return;
      }

      const child = await supabase
        .from("students")
        .select("id, full_name, profile_data")
        .eq("id", studentId)
        .eq("organization_id", organization.data.id)
        .maybeSingle();

      if (child.error || !child.data) {
        setError(child.error?.message || "تعذر العثور على ملف الطفل.");
        setLoading(false);
        return;
      }

      const profile = (child.data.profile_data || {}) as ProfileData;
      setFullName(child.data.full_name);
      setBirthDate(profile.birth_date || "");
      setGender(profile.gender || "");
      setGradeLevel(profile.grade_level || "");
      setAvatar(profile.avatar || "leaf");
      setLoading(false);
    }

    loadChild();
  }, [router, studentId]);

  const age = useMemo(() => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(`${birthDate}T00:00:00`);
    let years = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) years -= 1;
    return years >= 0 ? years : null;
  }, [birthDate]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) return;
    if (fullName.trim().length < 2 || !birthDate || !gender || !gradeLevel.trim()) {
      setError("أكمل جميع البيانات الأساسية.");
      return;
    }

    setSaving(true);
    const result = await supabase
      .from("students")
      .update({
        full_name: fullName.trim(),
        profile_data: {
          birth_date: birthDate,
          gender,
          grade_level: gradeLevel.trim(),
          avatar
        }
      })
      .eq("id", studentId);
    setSaving(false);

    if (result.error) {
      setError(`تعذر حفظ التعديل: ${result.error.message}`);
      return;
    }

    setSuccess("تم حفظ بيانات الطفل بنجاح.");
    setEditing(false);
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل ملف الطفل...</main>;

  if (error && !fullName) {
    return (
      <main className="auth-page compact-auth-page">
        <section className="auth-panel auth-status-panel">
          <p className="form-message error-message">{error}</p>
          <Link className="auth-submit link-submit" href="/dashboard">العودة إلى لوحة الأسرة</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href="/dashboard">لوحة الأسرة</Link>
      </header>

      <section className="child-profile-hero">
        <span className="profile-avatar-large">{avatarSymbols[avatar] || fullName.slice(0, 1)}</span>
        <div>
          <span className="section-label">ملف الطفل</span>
          <h1>{fullName}</h1>
          <p>{gender === "female" ? "ابنة" : "ابن"} · {age !== null ? `${age} سنوات` : "العمر غير محدد"} · {gradeLevel || "الصف غير محدد"}</p>
        </div>
        <button className="quiet-button" type="button" onClick={() => setEditing((value) => !value)}>
          {editing ? "إلغاء التعديل" : "تعديل البيانات"}
        </button>
      </section>

      {editing ? (
        <section className="profile-edit-card">
          <form className="auth-form" onSubmit={handleSave}>
            <label>الاسم الكامل<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
            <div className="form-grid-two">
              <label>تاريخ الميلاد<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required /></label>
              <label>الجنس<select value={gender} onChange={(event) => setGender(event.target.value)} required><option value="">اختر</option><option value="male">ابن</option><option value="female">ابنة</option></select></label>
            </div>
            <label>الصف الدراسي<input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} required /></label>
            <fieldset className="avatar-fieldset"><legend>الصورة الرمزية</legend><div className="avatar-options">{avatars.map((item) => <label className={avatar === item.key ? "avatar-option selected" : "avatar-option"} key={item.key}><input type="radio" name="avatar" checked={avatar === item.key} onChange={() => setAvatar(item.key)} /><span>{item.symbol}</span><small>{item.label}</small></label>)}</div></fieldset>
            {error && <p className="form-message error-message">{error}</p>}
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button>
          </form>
        </section>
      ) : (
        <section className="profile-summary-grid">
          <article><span>العمر</span><strong>{age !== null ? `${age} سنوات` : "غير محدد"}</strong></article>
          <article><span>الصف الدراسي</span><strong>{gradeLevel || "غير محدد"}</strong></article>
          <article><span>النقاط الحالية</span><strong>0 نقطة</strong></article>
          <article><span>الهدف الحالي</span><strong>لا يوجد هدف بعد</strong></article>
        </section>
      )}

      {success && <p className="form-message success-message profile-success">{success}</p>}

      <section className="profile-next-card">
        <div><span className="section-label">الخطوة القادمة</span><h2>ابدأ أول هدف</h2><p>بعد اكتمال بيانات الطفل سنبدأ نظام الأهداف وفق المرحلة التالية من الخطة.</p></div>
        <button className="quiet-button" type="button" disabled>إضافة هدف قريبًا</button>
      </section>
    </main>
  );
}
