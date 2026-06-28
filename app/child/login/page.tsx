"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ChildLoginPage() {
  const router = useRouter();
  const [familyCode, setFamilyCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const client = supabase;
    if (!client) {
      setError("تعذر الاتصال بالخدمة.");
      return;
    }

    if (familyCode.trim().length < 8 || !/^\d{6}$/.test(pin)) {
      setError("تحقق من رمز الأسرة والرقم السري المكون من 6 أرقام.");
      return;
    }

    setLoading(true);
    const result = await client.rpc("authenticate_child_simple", {
      p_family_code: familyCode.trim().toUpperCase(),
      p_pin: pin
    });
    setLoading(false);

    if (result.error || !result.data?.[0]) {
      const message = result.error?.message || "بيانات الدخول غير صحيحة.";
      setError(message.includes("15 دقيقة") ? message : "رمز الأسرة أو الرقم السري غير صحيح.");
      return;
    }

    const session = result.data[0];
    localStorage.setItem("namaa_child_token", session.session_token);
    localStorage.setItem("namaa_child_name", session.full_name);
    router.push("/child");
  }

  return (
    <main className="auth-page compact-auth-page child-login-page">
      <section className="auth-panel child-login-panel simplified-child-login">
        <Link className="auth-brand" href="/"><span className="brand-mark">و</span><span>واعي كيدز</span></Link>

        <div className="auth-heading">
          <span className="section-label">دخول الطفل</span>
          <h1>مرحبًا بك في واعي كيدز</h1>
          <p>اكتب رمز الأسرة الثابت، ثم رقمك السري الخاص.</p>
        </div>

        <div className="child-login-steps">
          <article><span>1</span><div><strong>رمز الأسرة</strong><small>واحد لجميع أفراد الأسرة</small></div></article>
          <article><span>2</span><div><strong>رقمك السري</strong><small>خاص بحسابك أنت فقط</small></div></article>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            رمز الأسرة
            <input
              value={familyCode}
              onChange={(event) => setFamilyCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={10}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="مثال: A1B2C3D4E5"
              required
            />
          </label>

          <label>
            الرقم السري الخاص بك
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="form-message error-message">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "جارٍ الدخول..." : "دخول حسابي"}</button>
        </form>

        <div className="child-login-help">🔐 الرقم السري يحدد حساب الطفل تلقائيًا داخل الأسرة.</div>
        <p className="auth-switch"><Link href="/login">دخول ولي الأمر</Link></p>
      </section>
    </main>
  );
}
