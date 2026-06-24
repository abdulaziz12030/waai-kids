"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type AccessDetails = {
  family_code: string;
  child_code?: string;
  is_enabled: boolean;
};

function friendlyError(message: string) {
  if (message.includes("مستخدم لطفل آخر")) return "هذا الرقم السري مستخدم لطفل آخر في الأسرة.";
  if (message.includes("6 أرقام")) return "الرقم السري يجب أن يتكون من 6 أرقام.";
  if (message.includes("غير مصرح") || message.includes("not authorized")) return "غير مصرح لك بتنفيذ هذه العملية.";
  return "تعذر تنفيذ العملية الآن. حاول مرة أخرى.";
}

export default function ChildAccessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [details, setDetails] = useState<AccessDetails | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDetails() {
    const client = supabase;
    if (!client) return;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }
    const result = await client.rpc("get_child_access_details", { p_student_id: studentId });
    if (result.error) setError(friendlyError(result.error.message));
    else setDetails(result.data?.[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    loadDetails();
  }, [studentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!/^\d{6}$/.test(pin)) {
      setError("الرقم السري يجب أن يتكون من 6 أرقام.");
      return;
    }
    const client = supabase;
    if (!client) return;
    setSaving(true);
    const result = await client.rpc("set_child_access_pin", { p_student_id: studentId, p_pin: pin });
    setSaving(false);
    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    setPin("");
    setSuccess("تم تحديث الرقم السري وتسجيل خروج الطفل من الأجهزة السابقة.");
    await loadDetails();
  }

  async function revokeSessions() {
    const client = supabase;
    if (!client) return;
    setError("");
    setSuccess("");
    setRevoking(true);
    const result = await client.rpc("revoke_child_sessions", { p_student_id: studentId });
    setRevoking(false);
    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    const count = Number(result.data || 0);
    setSuccess(count > 0 ? `تم تسجيل خروج الطفل من ${count} جلسة.` : "لا توجد جلسات نشطة للطفل حاليًا.");
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز بيانات دخول الطفل...</main>;

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>

      <section className="goals-panel child-access-panel simplified-access-panel">
        <div className="goals-panel-head">
          <div>
            <span className="section-label">دخول الطفل</span>
            <h2>دخول أسهل وأكثر أمانًا</h2>
            <p>رمز أسرة ثابت لجميع الأبناء، ورقم سري مستقل لكل طفل.</p>
          </div>
        </div>

        {details && (
          <div className="child-access-codes simplified-access-codes">
            <article><span>رمز الأسرة الثابت</span><strong>{details.family_code}</strong><small>يستخدمه جميع أطفال الأسرة</small></article>
            <article><span>الحالة</span><strong>{details.is_enabled ? "مفعّل" : "غير مفعّل"}</strong><small>لا يوجد رمز طفل إضافي</small></article>
          </div>
        )}

        <div className="child-access-grid">
          <form className="auth-form child-pin-form" onSubmit={handleSubmit}>
            <label>
              الرقم السري الخاص بالطفل
              <input inputMode="numeric" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="000000" autoComplete="new-password" required />
            </label>
            <p className="field-help">6 أرقام، ويجب أن يكون مختلفًا عن أرقام بقية الأطفال.</p>
            {error && <p className="form-message error-message">{error}</p>}
            {success && <p className="form-message success-message">{success}</p>}
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : details?.is_enabled ? "تغيير الرقم السري" : "تفعيل دخول الطفل"}</button>
          </form>

          <aside className="child-session-card">
            <span className="session-card-icon">🛡️</span>
            <div><strong>التحكم في الجلسات</strong><p>يمكنك إنهاء دخول الطفل من جميع الأجهزة عند الحاجة.</p></div>
            <button type="button" onClick={revokeSessions} disabled={revoking}>{revoking ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج من كل الأجهزة"}</button>
          </aside>
        </div>

        <div className="child-access-note">
          <strong>طريقة الدخول</strong>
          <p>يدخل الطفل برمز الأسرة والرقم السري فقط، ويتعرف نماء على حسابه تلقائيًا.</p>
        </div>
      </section>
    </main>
  );
}
