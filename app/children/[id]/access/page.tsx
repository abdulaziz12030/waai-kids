"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type AccessDetails = {
  family_code: string;
  child_code: string;
  is_enabled: boolean;
};

export default function ChildAccessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [details, setDetails] = useState<AccessDetails | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (result.error) {
      setError(result.error.message);
    } else {
      setDetails(result.data?.[0] || null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDetails();
  }, [studentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{4}$/.test(pin)) {
      setError("الرمز السري يجب أن يتكون من 4 أرقام.");
      return;
    }

    const client = supabase;
    if (!client) return;

    setSaving(true);
    const result = await client.rpc("set_child_access_pin", {
      p_student_id: studentId,
      p_pin: pin
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setPin("");
    setSuccess("تم تفعيل دخول الطفل وتحديث الرمز السري.");
    await loadDetails();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز بيانات دخول الطفل...</main>;

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>

      <section className="goals-panel child-access-panel">
        <div className="goals-panel-head">
          <div>
            <span className="section-label">دخول الطفل</span>
            <h2>إعداد الحساب المحدود</h2>
            <p>هذه البيانات مخصصة للطفل، ولا تمنحه صلاحيات ولي الأمر.</p>
          </div>
        </div>

        {details && (
          <div className="child-access-codes">
            <article><span>رمز الأسرة</span><strong>{details.family_code}</strong></article>
            <article><span>رمز الطفل</span><strong>{details.child_code}</strong></article>
            <article><span>الحالة</span><strong>{details.is_enabled ? "مفعّل" : "غير مفعّل"}</strong></article>
          </div>
        )}

        <form className="auth-form child-pin-form" onSubmit={handleSubmit}>
          <label>
            رمز سري من 4 أرقام
            <input
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              required
            />
          </label>

          {error && <p className="form-message error-message">{error}</p>}
          {success && <p className="form-message success-message">{success}</p>}

          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? "جارٍ الحفظ..." : details?.is_enabled ? "تغيير الرمز السري" : "تفعيل دخول الطفل"}
          </button>
        </form>

        <div className="child-access-note">
          <strong>صلاحيات الطفل</strong>
          <p>عرض أهدافه، متابعة تقدمه، وطلب هدف جديد فقط. لا يستطيع الموافقة أو الرفض أو تعديل النقاط والمكافآت.</p>
        </div>
      </section>
    </main>
  );
}
