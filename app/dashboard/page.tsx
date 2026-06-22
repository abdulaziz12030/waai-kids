"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      setEmail(data.session.user.email || "");
      setLoading(false);
    }

    loadSession();
  }, [router]);

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return <main className="dashboard-loading">جارٍ تجهيز لوحة الأسرة...</main>;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="brand" href="/">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>
        <button className="quiet-button" type="button" onClick={signOut}>تسجيل الخروج</button>
      </header>

      <section className="dashboard-welcome">
        <span className="section-label">لوحة الأسرة</span>
        <h1>مرحبًا بك في نماء</h1>
        <p>{email}</p>
      </section>

      <section className="dashboard-empty-state">
        <div>
          <span className="empty-icon">+</span>
          <h2>ابدأ بإنشاء أسرتك</h2>
          <p>في الخطوة التالية سنضيف نموذج الأسرة ثم بيانات الأبناء.</p>
          <button className="auth-submit" type="button" disabled>إنشاء الأسرة قريبًا</button>
        </div>
      </section>
    </main>
  );
}
