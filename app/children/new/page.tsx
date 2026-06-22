"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const avatars = [
  { key: "leaf", label: "ورقة", symbol: "🌿" },
  { key: "star", label: "نجمة", symbol: "⭐" },
  { key: "book", label: "كتاب", symbol: "📘" },
  { key: "moon", label: "هلال", symbol: "🌙" }
];

export default function NewChildPage() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [avatar, setAvatar] = useState("leaf");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function prepare() {
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

      if (organization.error) {
        setError(`تعذر الوصول إلى الأسرة: ${organization.error.message}`);
        setLoading(false);
        return;
      }

      if (!organization.data) {
        router.replace("/onboarding");
        return;
      }

      setOrganizationId(organization.data.id);
      setLoading(false);
    }

    prepare();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase || !organizationId) return;

    const cleanName = fullName.trim();
    if (cleanName.length < 2) {
      setError("اكتب اسمًا صحيحًا للابن أو الابنة.");
      return;
    }

    if (!birthDate || !gender || !gradeLevel) {
      setError("أكمل تاريخ الميلاد والجنس والصف الدراسي.");
      return;
    }

    setSaving(true);

    const result = await supabase.from("students").insert({
      organization_id: organizationId,
      full_name: cleanName,
      profile_data: {
        birth_date: birthDate,
        gender,
        grade_level: gradeLevel.trim(),
        avatar
      }
    }).select("id").single();

    setSaving(false);

    if (result.error) {
      setError(`تعذر إضافة الابن أو الابنة: ${result.error.message}`);
      return;
    }

    router.push(`/children/${result.data.id}`);
    router.refresh();
  }

  if (loading) {
    return <main className="dashboard-loading">جارٍ تجهيز نموذج الإضافة...</main>;
  }

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel child-form-panel">
        <Link className="auth-brand" href="/dashboard">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>

        <div className="auth-heading">
          <span className="section-label">إضافة الأبناء</span>
          <h1>أضف ابنًا أو ابنة</h1>
          <p>أدخل البيانات الأساسية لتجهيز ملف مستقل وواضح.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            الاسم الكامل
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="مثال: عمر عبدالعزيز" autoComplete="off" required />
          </label>

          <div className="form-grid-two">
            <label>
              تاريخ الميلاد
              <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required />
            </label>

            <label>
              الجنس
              <select value={gender} onChange={(event) => setGender(event.target.value)} required>
                <option value="">اختر</option>
                <option value="male">ابن</option>
                <option value="female">ابنة</option>
              </select>
            </label>
          </div>

          <label>
            الصف الدراسي
            <input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="مثال: الصف الرابع الابتدائي" required />
          </label>

          <fieldset className="avatar-fieldset">
            <legend>الصورة الرمزية</legend>
            <div className="avatar-options">
              {avatars.map((item) => (
                <label className={avatar === item.key ? "avatar-option selected" : "avatar-option"} key={item.key}>
                  <input type="radio" name="avatar" value={item.key} checked={avatar === item.key} onChange={() => setAvatar(item.key)} />
                  <span>{item.symbol}</span>
                  <small>{item.label}</small>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="form-message error-message">{error}</p>}

          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? "جارٍ الإضافة..." : "إضافة وحفظ الملف"}
          </button>
        </form>

        <p className="auth-switch"><Link href="/dashboard">العودة إلى لوحة الأسرة</Link></p>
      </section>
    </main>
  );
}
