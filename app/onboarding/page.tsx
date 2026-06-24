"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [accountType, setAccountType] = useState<"family" | "teacher">("family");
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
      setOrganizationName(savedFamily || (savedName ? `أسرة ${savedName.split(" ")[0]}` : ""));
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

    const cleanFullName = fullName.trim();
    const cleanOrganizationName = organizationName.trim();
    const organizationId = user.id;

    const profile = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: cleanFullName }, { onConflict: "id" });

    if (profile.error) {
      setError(`تعذر حفظ الملف: ${profile.error.message}`);
      setSaving(false);
      return;
    }

    const organization = await supabase
      .from("organizations")
      .upsert({
        id: organizationId,
        name: cleanOrganizationName,
        type: accountType === "teacher" ? "independent_teacher" : "family",
        owner_id: user.id
      }, { onConflict: "id" });

    if (organization.error) {
      setError(`تعذر إنشاء الحساب: ${organization.error.message}`);
      setSaving(false);
      return;
    }

    const existingMembership = await supabase
      .from("memberships")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership.error) {
      setError(`تعذر التحقق من العضوية: ${existingMembership.error.message}`);
      setSaving(false);
      return;
    }

    const role = accountType === "teacher" ? "teacher" : "owner";
    const membership = existingMembership.data
      ? await supabase.from("memberships").update({ role, display_name: cleanFullName, is_active: true }).eq("id", existingMembership.data.id)
      : await supabase.from("memberships").insert({ organization_id: organizationId, user_id: user.id, role, display_name: cleanFullName });

    if (membership.error) {
      setError(`تعذر إنشاء العضوية: ${membership.error.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(accountType === "teacher" ? "/teacher" : "/dashboard");
    router.refresh();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز الحساب...</main>;

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel onboarding-role-panel">
        <Link className="auth-brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>

        <div className="auth-heading">
          <span className="section-label">إعداد الحساب</span>
          <h1>كيف ستستخدم نماء؟</h1>
          <p>اختر نوع الحساب ثم أكمل بياناتك.</p>
        </div>

        <div className="account-type-switch">
          <button type="button" className={accountType === "family" ? "active" : ""} onClick={() => { setAccountType("family"); setOrganizationName(fullName ? `أسرة ${fullName.split(" ")[0]}` : ""); }}><span>👨‍👩‍👧‍👦</span><strong>ولي أمر</strong><small>متابعة الأبناء والأسرة</small></button>
          <button type="button" className={accountType === "teacher" ? "active" : ""} onClick={() => { setAccountType("teacher"); setOrganizationName(fullName ? `حلقة ${fullName}` : ""); }}><span>👨‍🏫</span><strong>معلم قرآن</strong><small>متابعة الطلاب والتسميع</small></button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>الاسم الكامل<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
          <label>{accountType === "teacher" ? "اسم الحلقة أو اسم المعلم" : "اسم الأسرة"}<input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required /></label>
          {error && <p className="form-message error-message">{error}</p>}
          <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ إنشاء الحساب..." : accountType === "teacher" ? "إنشاء حساب المعلم" : "إنشاء الأسرة والمتابعة"}</button>
        </form>
      </section>
    </main>
  );
}
