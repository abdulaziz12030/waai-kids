"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName.trim(),
          family_name: familyName.trim()
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
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage("تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد لإكمال التسجيل.");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>

        <div className="auth-heading">
          <span className="section-label">ابدأ مع أسرتك</span>
          <h1>إنشاء حساب ولي الأمر</h1>
          <p>أنشئ حسابك أولًا، ثم ننتقل إلى إضافة الأبناء وتنظيم أهدافهم.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            الاسم الكامل
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="مثال: عبدالعزيز محمد"
              autoComplete="name"
              required
            />
          </label>

          <label>
            اسم الأسرة
            <input
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              placeholder="مثال: أسرة محمد"
              required
            />
          </label>

          <label>
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8 أحرف على الأقل"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {error && <p className="form-message error-message">{error}</p>}
          {message && <p className="form-message success-message">{message}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="auth-switch">
          لديك حساب؟ <Link href="/login">تسجيل الدخول</Link>
        </p>
      </section>

      <aside className="auth-side-card">
        <span className="section-label">نسخة الأسرة</span>
        <h2>ابدأ بهدوء، وتابع التقدم بوضوح.</h2>
        <ul>
          <li>ملف مستقل لكل ابن</li>
          <li>أهداف ومهام ونقاط</li>
          <li>خطط حفظ ومراجعة القرآن</li>
          <li>مكافآت مستحقة ومؤجلة</li>
        </ul>
      </aside>
    </main>
  );
}
