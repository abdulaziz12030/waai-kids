"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Supabase في Vercel.");
      return;
    }

    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setLoading(false);
      setError("بيانات الدخول غير صحيحة أو أن البريد لم يتم تأكيده بعد.");
      return;
    }

    const typeResult = await supabase.rpc("get_my_portal_type");
    setLoading(false);
    const portalType = typeResult.data || "new";
    router.push(portalType === "teacher" ? "/teacher" : portalType === "family" ? "/dashboard" : "/onboarding");
    router.refresh();
  }

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="auth-heading"><span className="section-label">مرحبًا بعودتك</span><h1>تسجيل الدخول</h1><p>ادخل إلى لوحة الأسرة أو حساب المعلم.</p></div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>البريد الإلكتروني<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></label>
          <label>كلمة المرور<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور" autoComplete="current-password" required /></label>
          <div className="form-row"><Link href="/forgot-password">نسيت كلمة المرور؟</Link></div>
          {error && <p className="form-message error-message">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}</button>
        </form>
        <p className="auth-switch">ليس لديك حساب؟ <Link href="/register">إنشاء حساب جديد</Link></p>
      </section>
    </main>
  );
}
