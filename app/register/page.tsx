"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<"family" | "teacher">("family");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("type") === "teacher") setAccountType("teacher");
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Supabase في Vercel.");
      return;
    }

    if (password.length < 8) {
      setError("يجب ألا تقل كلمة المرور عن 8 أحرف.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName.trim(),
          family_name: organizationName.trim(),
          account_type: accountType
        }
      }
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message === "User already registered"
        ? "هذا البريد مسجل مسبقًا. يمكنك تسجيل الدخول مباشرة."
        : signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setMessage("تم إنشاء الحساب. افتح بريدك واضغط رابط التأكيد لإكمال الإعداد.");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel teacher-register-panel">
        <Link className="auth-brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>

        <div className="auth-heading">
          <span className="section-label">إنشاء حساب جديد</span>
          <h1>{accountType === "teacher" ? "حساب معلم القرآن" : "حساب ولي الأمر"}</h1>
          <p>{accountType === "teacher" ? "أنشئ حسابك لمتابعة الطلاب والتسميع." : "أنشئ حساب الأسرة لمتابعة الأبناء."}</p>
        </div>

        <div className="account-type-switch">
          <button type="button" className={accountType === "family" ? "active" : ""} onClick={() => setAccountType("family")}><span>👨‍👩‍👧‍👦</span><strong>ولي أمر</strong><small>إدارة الأسرة والأبناء</small></button>
          <button type="button" className={accountType === "teacher" ? "active" : ""} onClick={() => setAccountType("teacher")}><span>👨‍🏫</span><strong>معلم قرآن</strong><small>الطلاب والتسميع</small></button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>الاسم الكامل<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="مثال: أحمد محمد" autoComplete="name" required /></label>
          <label>{accountType === "teacher" ? "اسم الحلقة أو الاسم الظاهر" : "اسم الأسرة"}<input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder={accountType === "teacher" ? "مثال: حلقة الإتقان" : "مثال: أسرة محمد"} required /></label>
          <label>البريد الإلكتروني<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></label>
          <label>كلمة المرور<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 أحرف على الأقل" autoComplete="new-password" minLength={8} required /></label>
          {error && <p className="form-message error-message">{error}</p>}
          {message && <p className="form-message success-message">{message}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "جارٍ إنشاء الحساب..." : accountType === "teacher" ? "إنشاء حساب المعلم" : "إنشاء حساب ولي الأمر"}</button>
        </form>

        <p className="auth-switch">لديك حساب؟ <Link href="/login">تسجيل الدخول</Link></p>
      </section>

      <aside className="auth-side-card">
        <span className="section-label">{accountType === "teacher" ? "حساب المعلم" : "نسخة الأسرة"}</span>
        <h2>{accountType === "teacher" ? "تابع الحفظ والتسميع بوضوح." : "ابدأ بهدوء، وتابع التقدم بوضوح."}</h2>
        <ul>
          {accountType === "teacher" ? <><li>طلاب مرتبطون فقط</li><li>مركز تسميع موحد</li><li>تسجيل الأخطاء والطلاقة والتجويد</li><li>تقارير الحفظ والإتقان</li></> : <><li>ملف مستقل لكل ابن</li><li>أهداف ومهام ونقاط</li><li>خطط حفظ ومراجعة القرآن</li><li>ربط الطفل بمعلمه</li></>}
        </ul>
      </aside>
    </main>
  );
}
