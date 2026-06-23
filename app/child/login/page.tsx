"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ChildLoginPage() {
  const router = useRouter();
  const [familyCode, setFamilyCode] = useState("");
  const [childCode, setChildCode] = useState("");
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

    if (!familyCode.trim() || !/^\d{4}$/.test(childCode) || !/^\d{4}$/.test(pin)) {
      setError("تحقق من رمز الأسرة ورمز الطفل والرمز السري.");
      return;
    }

    setLoading(true);
    const result = await client.rpc("authenticate_child", {
      p_family_code: familyCode.trim(),
      p_child_code: childCode,
      p_pin: pin
    });
    setLoading(false);

    if (result.error || !result.data?.[0]) {
      setError(result.error?.message || "بيانات الدخول غير صحيحة.");
      return;
    }

    const session = result.data[0];
    localStorage.setItem("namaa_child_token", session.session_token);
    localStorage.setItem("namaa_child_name", session.full_name);
    router.push("/child");
  }

  return (
    <main className="auth-page compact-auth-page child-login-page">
      <section className="auth-panel child-login-panel">
        <Link className="auth-brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>

        <div className="auth-heading">
          <span className="section-label">دخول الطفل</span>
          <h1>مرحبًا بك في نماء</h1>
          <p>استخدم البيانات التي أعطاك إياها ولي الأمر.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            رمز الأسرة
            <input value={familyCode} onChange={(event) => setFamilyCode(event.target.value.toUpperCase())} placeholder="مثال: A1B2C3D4" required />
          </label>
          <label>
            رمز الطفل
            <input inputMode="numeric" maxLength={4} value={childCode} onChange={(event) => setChildCode(event.target.value.replace(/\D/g, ""))} placeholder="0000" required />
          </label>
          <label>
            الرمز السري
            <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="••••" required />
          </label>

          {error && <p className="form-message error-message">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "جارٍ الدخول..." : "دخول الطفل"}</button>
        </form>

        <p className="auth-switch"><Link href="/login">دخول ولي الأمر</Link></p>
      </section>
    </main>
  );
}
