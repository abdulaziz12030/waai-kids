"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("جارٍ تأكيد الحساب...");

  useEffect(() => {
    async function confirmSession() {
      if (!supabase) {
        setMessage("تعذر الاتصال بقاعدة البيانات.");
        return;
      }

      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/dashboard";

      if (!code) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace(next);
          return;
        }
        setMessage("رابط التأكيد غير مكتمل أو انتهت صلاحيته.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage("تعذر تأكيد الحساب. أعد فتح أحدث رابط من بريدك.");
        return;
      }

      router.replace(next);
      router.refresh();
    }

    confirmSession();
  }, [router, searchParams]);

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel auth-status-panel">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>
        <div className="auth-heading">
          <span className="section-label">تأكيد آمن</span>
          <h1>{message}</h1>
          <p>يمكنك العودة إلى تسجيل الدخول إذا لم يتم الانتقال تلقائيًا.</p>
        </div>
        <Link className="auth-submit link-submit" href="/login">العودة لتسجيل الدخول</Link>
      </section>
    </main>
  );
}
