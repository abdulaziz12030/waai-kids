"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function onboardingError(message?: string) {
  if (!message) return "تعذر إنشاء الحساب الآن.";
  if (message.includes("ACCOUNT_NOT_ACTIVE")) return "هذا الحساب موقوف من إدارة المنصة.";
  if (message.includes("ACCOUNT_TYPE_LOCKED")) return "لا يمكن تغيير نوع الحساب بعد إضافة طلاب أو بيانات مرتبطة به.";
  if (message.includes("ORGANIZATION_CONFLICT")) return "تعذر ربط الجهة بهذا الحساب.";
  if (message.includes("FULL_NAME_REQUIRED")) return "اكتب الاسم الكامل.";
  if (message.includes("ORGANIZATION_NAME_REQUIRED")) return "اكتب اسم الأسرة أو الحلقة.";
  return "تعذر إكمال إنشاء الحساب. حاول مرة أخرى.";
}

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
      const savedOrganization = String(user.user_metadata?.family_name || "");
      const savedType = String(user.user_metadata?.account_type || "family") === "teacher" ? "teacher" : "family";
      setFullName(savedName);
      setAccountType(savedType);
      setOrganizationName(savedOrganization || (savedType === "teacher" ? `حلقة ${savedName}` : savedName ? `أسرة ${savedName.split(" ")[0]}` : ""));
      setLoading(false);
    }

    void prepare();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase) return;

    const cleanFullName = fullName.trim();
    const cleanOrganizationName = organizationName.trim();
    if (cleanFullName.length < 2 || cleanOrganizationName.length < 2) {
      setError("أكمل الاسم واسم الأسرة أو الحلقة.");
      return;
    }

    setSaving(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSaving(false);
      router.replace("/login");
      return;
    }

    const result = await supabase.rpc("complete_account_onboarding", {
      p_full_name: cleanFullName,
      p_organization_name: cleanOrganizationName,
      p_account_type: accountType
    });

    if (result.error) {
      setError(onboardingError(result.error.message));
      setSaving(false);
      return;
    }

    const metadata = await supabase.auth.updateUser({
      data: {
        full_name: cleanFullName,
        family_name: cleanOrganizationName,
        account_type: accountType
      }
    });

    if (metadata.error) {
      setError("تم إنشاء الحساب، لكن تعذر تحديث بيانات العرض. أعد تسجيل الدخول ثم حاول مرة أخرى.");
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
        <Link className="auth-brand" href="/"><span className="brand-mark">و</span><span>واعي كيدز</span></Link>
        <div className="auth-heading"><span className="section-label">إعداد الحساب</span><h1>كيف ستستخدم واعي كيدز؟</h1><p>اختر نوع الحساب ثم أكمل بياناتك.</p></div>

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
