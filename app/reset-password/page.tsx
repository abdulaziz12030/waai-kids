"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("تعذر الاتصال بالخدمة.");
      return;
    }

    if (newPassword.length < 8) {
      setError("يجب ألا تقل كلمة المرور عن 8 أحرف.");
      return;
    }

    if (newPassword !== confirmation) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    const result = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (result.error) {
      setError("تعذر تحديث كلمة المرور. أعد فتح أحدث رابط من بريدك.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
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
          <h1>تعيين كلمة مرور جديدة</h1>
          <p>أدخل كلمة المرور الجديدة مرتين للتأكد.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            كلمة المرور الجديدة
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" required />
          </label>
          <label>
            تأكيد كلمة المرور
            <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required />
          </label>
          {error && <p className="form-message error-message">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>
        </form>
      </section>
    </main>
  );
}
