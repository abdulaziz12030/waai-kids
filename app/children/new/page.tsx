"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function NewChildPage() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState("");
  const [fullName, setFullName] = useState("");
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

    setSaving(true);

    const result = await supabase.from("students").insert({
      organization_id: organizationId,
      full_name: cleanName
    });

    setSaving(false);

    if (result.error) {
      setError(`تعذر إضافة الابن أو الابنة: ${result.error.message}`);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return <main className="dashboard-loading">جارٍ تجهيز نموذج الإضافة...</main>;
  }

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/dashboard">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>

        <div className="auth-heading">
          <span className="section-label">إضافة الأبناء</span>
          <h1>أضف ابنًا أو ابنة</h1>
          <p>ابدأ بالاسم الآن، وسنكمل البيانات الأخرى في الخطوات التالية.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            الاسم الكامل
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="مثال: عمر عبدالعزيز"
              autoComplete="off"
              required
            />
          </label>

          {error && <p className="form-message error-message">{error}</p>}

          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? "جارٍ الإضافة..." : "إضافة الابن أو الابنة"}
          </button>
        </form>

        <p className="auth-switch">
          <Link href="/dashboard">العودة إلى لوحة الأسرة</Link>
        </p>
      </section>
    </main>
  );
}
