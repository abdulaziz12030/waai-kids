"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [familyName, setFamilyName] = useState("");
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

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const savedName = String(user.user_metadata?.full_name || "");
      const savedFamily = String(user.user_metadata?.family_name || "");
      setFullName(savedName);
      setFamilyName(savedFamily || (savedName ? `أسرة ${savedName.split(" ")[0]}` : ""));
      setLoading(false);
    }

    prepare();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase) return;

    setSaving(true);
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setSaving(false);
      router.replace("/login");
      return;
    }

    const profile = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName.trim() }, { onConflict: "id" });

    if (profile.error) {
      setError("تعذر حفظ ملف ولي الأمر.");
      setSaving(false);
      return;
    }

    const existing = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .eq("type", "family")
      .maybeSingle();

    let organizationId = existing.data?.id;

    if (!organizationId) {
      const created = await supabase
        .from("organizations")
        .insert({ name: familyName.trim(), type: "family", owner_id: user.id })
        .select("id")
        .single();

      if (created.error || !created.data) {
        setError("تعذر إنشاء الأسرة.");
        setSaving(false);
        return;
      }

      organizationId = created.data.id;

      const membership = await supabase.from("memberships").insert({
        organization_id: organizationId,
        user_id: user.id,
        role: "owner",
        display_name: fullName.trim()
      });

      if (membership.error) {
        setError("تعذر إنشاء عضوية ولي الأمر.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return <main className="dashboard-loading">جارٍ تجهيز الأسرة...</main>;
  }

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>

        <div className="auth-heading">
          <span className="section-label">إعداد الأسرة</span>
          <h1>أكمل بيانات أسرتك</h1>
          <p>سننشئ ملف ولي الأمر والأسرة مرة واحدة فقط.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            اسم ولي الأمر
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
          <label>
            اسم الأسرة
            <input value={familyName} onChange={(event) => setFamilyName(event.target.value)} required />
          </label>

          {error && <p className="form-message error-message">{error}</p>}

          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? "جارٍ إنشاء الأسرة..." : "إنشاء الأسرة والمتابعة"}
          </button>
        </form>
      </section>
    </main>
  );
}
