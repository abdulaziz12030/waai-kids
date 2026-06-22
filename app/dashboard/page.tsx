"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const organization = await supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", session.user.id)
        .eq("type", "family")
        .maybeSingle();

      if (!organization.data) {
        router.replace("/onboarding");
        return;
      }

      setEmail(session.user.email || "");
      setFamilyName(organization.data.name);
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
        <h1>{familyName}</h1>
        <p>{email}</p>
      </section>

      <section className="dashboard-empty-state">
        <div>
          <span className="empty-icon">+</span>
          <h2>أضف أول ابن أو ابنة</h2>
          <p>تم إنشاء الأسرة بنجاح. الخطوة التالية هي إضافة الأبناء وبياناتهم الأساسية.</p>
          <Link className="auth-submit link-submit" href="/children/new">إضافة ابن أو ابنة</Link>
        </div>
      </section>
    </main>
  );
}
