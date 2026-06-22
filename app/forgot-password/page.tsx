"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
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

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    setLoading(false);

    if (resetError) {
      setError("تعذر إرسال رابط الاستعادة الآن. حاول مرة أخرى لاحقًا.");
      return;
    }

    setMessage("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.");
  }

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>

        <div className="auth-heading">
          <span className="section-label">استعادة الحساب</span>
          <h1>نسيت كلمة المرور؟</h1>
          <p>أدخل بريدك وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          {error && <p className="form-message error-message">{error}</p>}
          {message && <p className="form-message success-message">{message}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
          </button>
        </form>

        <p className="auth-switch">
          تذكرت كلمة المرور؟ <Link href="/login">العودة لتسجيل الدخول</Link>
        </p>
      </section>
    </main>
  );
}
