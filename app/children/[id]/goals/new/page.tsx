"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

export default function NewGoalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [organizationId, setOrganizationId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState("educational");
  const [targetValue, setTargetValue] = useState("");
  const [childContribution, setChildContribution] = useState("0");
  const [requiredPoints, setRequiredPoints] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function prepare() {
      const client = supabase;
      if (!client) {
        setError("تعذر الاتصال بالخدمة.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const organization = await client
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .eq("type", "family")
        .maybeSingle();

      if (!organization.data) {
        router.replace("/onboarding");
        return;
      }

      const student = await client
        .from("students")
        .select("id, full_name")
        .eq("id", studentId)
        .eq("organization_id", organization.data.id)
        .maybeSingle();

      if (!student.data) {
        setError("تعذر العثور على ملف الطفل.");
        setLoading(false);
        return;
      }

      setOrganizationId(organization.data.id);
      setStudentName(student.data.full_name);
      setLoading(false);
    }

    prepare();
  }, [router, studentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const client = supabase;
    if (!client || !organizationId) return;

    const { data: userData } = await client.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    if (title.trim().length < 3) {
      setError("اكتب عنوانًا واضحًا للهدف.");
      return;
    }

    if (startDate && dueDate && dueDate < startDate) {
      setError("تاريخ الاستحقاق يجب أن يكون بعد تاريخ البداية.");
      return;
    }

    setSaving(true);
    const result = await client.from("goals").insert({
      organization_id: organizationId,
      student_id: studentId,
      title: title.trim(),
      description: description.trim() || null,
      goal_type: goalType,
      status: "pending",
      target_value: targetValue ? Number(targetValue) : null,
      child_contribution: Number(childContribution || 0),
      required_points: Number(requiredPoints || 0),
      start_date: startDate || null,
      due_date: dueDate || null,
      progress: 0,
      created_by: user.id
    });
    setSaving(false);

    if (result.error) {
      setError(`تعذر إنشاء الهدف: ${result.error.message}`);
      return;
    }

    router.push(`/children/${studentId}`);
    router.refresh();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز نموذج الهدف...</main>;

  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-panel goal-form-panel">
        <Link className="auth-brand" href={`/children/${studentId}`}>
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </Link>

        <div className="auth-heading">
          <span className="section-label">هدف جديد</span>
          <h1>أنشئ هدفًا لـ {studentName}</h1>
          <p>حدد نوع الهدف وقيمته ومدته والنقاط المطلوبة قبل اعتماده.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            عنوان الهدف
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: إتقان جدول الضرب" required />
          </label>

          <label>
            وصف الهدف
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="اشرح المطلوب باختصار" rows={4} />
          </label>

          <label>
            نوع الهدف
            <select value={goalType} onChange={(event) => setGoalType(event.target.value)}>
              <option value="educational">تعليمي</option>
              <option value="behavioral">سلوكي</option>
              <option value="financial">مالي</option>
              <option value="material">عيني</option>
            </select>
          </label>

          <div className="form-grid-two">
            <label>
              قيمة الهدف بالريال
              <input type="number" min="0" step="0.01" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder="اختياري" />
            </label>
            <label>
              مساهمة الطفل
              <input type="number" min="0" step="0.01" value={childContribution} onChange={(event) => setChildContribution(event.target.value)} />
            </label>
          </div>

          <label>
            النقاط المطلوبة
            <input type="number" min="0" step="1" value={requiredPoints} onChange={(event) => setRequiredPoints(event.target.value)} />
          </label>

          <div className="form-grid-two">
            <label>
              تاريخ البداية
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              تاريخ الاستحقاق
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          </div>

          {error && <p className="form-message error-message">{error}</p>}

          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? "جارٍ إنشاء الهدف..." : "إنشاء الهدف"}
          </button>
        </form>

        <p className="auth-switch"><Link href={`/children/${studentId}`}>العودة إلى ملف الطفل</Link></p>
      </section>
    </main>
  );
}
