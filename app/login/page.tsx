"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type LoginRole = "family" | "teacher";
type PortalAccess = { family?: boolean; teacher?: boolean };

const roleCopy: Record<LoginRole, { eyebrow: string; title: string; description: string; icon: string }> = {
  family: {
    eyebrow: "دخول ولي الأمر",
    title: "لوحة المتابعة الأسرية",
    description: "متابعة الأبناء والخطط والنتائج والمكافآت، دون أدوات التقييم المهني.",
    icon: "👨‍👩‍👧‍👦"
  },
  teacher: {
    eyebrow: "دخول المعلم",
    title: "اللوحة المهنية للمعلم",
    description: "إدارة الطلاب وخطط الحفظ ومركز التسميع والتقييم والاعتماد.",
    icon: "👨‍🏫"
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [loginRole, setLoginRole] = useState<LoginRole>("family");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get("type");
    if (requestedRole === "teacher" || requestedRole === "family") setLoginRole(requestedRole);
  }, []);

  function chooseRole(role: LoginRole) {
    setLoginRole(role);
    setError("");
    const url = new URL(window.location.href);
    url.searchParams.set("type", role);
    window.history.replaceState({}, "", url.toString());
  }

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

    const accessResult = await supabase.rpc("get_my_portal_access");
    const access = (accessResult.data || {}) as PortalAccess;

    if (accessResult.error) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("تعذر التحقق من نوع الحساب. حاول مرة أخرى.");
      return;
    }

    if (loginRole === "teacher" && !access.teacher) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(access.family ? "هذا حساب ولي أمر. اختر «دخول ولي الأمر»." : "هذا الحساب غير مفعّل كحساب معلم بعد.");
      return;
    }

    if (loginRole === "family" && !access.family) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(access.teacher ? "هذا حساب معلم. اختر «دخول المعلم»." : "هذا الحساب غير مفعّل كحساب ولي أمر بعد.");
      return;
    }

    window.sessionStorage.setItem("namaa_active_portal", loginRole);
    setLoading(false);
    router.push(loginRole === "teacher" ? "/teacher" : "/dashboard");
    router.refresh();
  }

  const copy = roleCopy[loginRole];

  return (
    <main className={`auth-page compact-auth-page role-login-page login-role-${loginRole}`}>
      <section className="auth-panel role-login-panel">
        <Link className="auth-brand" href="/"><span className="brand-mark">ن</span><span>نماء</span></Link>

        <div className="login-role-selector" role="tablist" aria-label="اختيار نوع الدخول">
          <button className={loginRole === "family" ? "active" : ""} type="button" onClick={() => chooseRole("family")}>
            <span>👨‍👩‍👧‍👦</span><div><strong>ولي الأمر</strong><small>متابعة وإشراف</small></div>
          </button>
          <button className={loginRole === "teacher" ? "active" : ""} type="button" onClick={() => chooseRole("teacher")}>
            <span>👨‍🏫</span><div><strong>المعلم</strong><small>إدارة وتسميع</small></div>
          </button>
        </div>

        <div className="auth-heading role-login-heading">
          <span className="login-role-icon">{copy.icon}</span>
          <div><span className="section-label">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>البريد الإلكتروني<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></label>
          <label>كلمة المرور<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور" autoComplete="current-password" required /></label>
          <div className="form-row"><Link href="/forgot-password">نسيت كلمة المرور؟</Link></div>
          {error && <p className="form-message error-message">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "جارٍ التحقق من الحساب..." : loginRole === "teacher" ? "دخول لوحة المعلم" : "دخول لوحة ولي الأمر"}</button>
        </form>

        <div className="login-account-options">
          <span>ليس لديك حساب؟</span>
          <div>
            {loginRole === "family" ? <Link href="/register">إنشاء حساب ولي أمر</Link> : <Link className="teacher-register-link" href="/register?type=teacher">إنشاء حساب معلم قرآن</Link>}
          </div>
        </div>
      </section>
    </main>
  );
}
