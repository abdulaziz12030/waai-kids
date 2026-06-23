"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Goal = {
  id: string;
  title: string | null;
  description: string | null;
  goal_type: string;
  status: string;
  target_value: number | null;
  child_contribution: number | null;
  required_points: number | null;
  start_date: string | null;
  due_date: string | null;
  progress: number | null;
};

const typeLabels: Record<string, string> = {
  financial: "مالي",
  material: "عيني",
  educational: "تعليمي",
  behavioral: "سلوكي"
};

const statusLabels: Record<string, string> = {
  pending: "بانتظار الموافقة",
  approved: "نشط",
  rejected: "مرفوض",
  completed: "مكتمل",
  paused: "متوقف"
};

export default function ChildGoals({ studentId }: { studentId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadGoals() {
    const client = supabase;
    if (!client) return;

    setLoading(true);
    const result = await client
      .from("goals")
      .select("id, title, description, goal_type, status, target_value, child_contribution, required_points, start_date, due_date, progress")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (result.error) {
      setError(result.error.message);
    } else {
      setGoals(result.data || []);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGoals();
  }, [studentId]);

  async function updateGoal(id: string, patch: Partial<Goal>) {
    const client = supabase;
    if (!client) return;

    setSavingId(id);
    setError("");

    let payload: Record<string, unknown> = {
      ...patch,
      updated_at: new Date().toISOString()
    };

    if (patch.status === "approved") {
      const { data } = await client.auth.getUser();
      payload = {
        ...payload,
        approved_by: data.user?.id || null,
        approved_at: new Date().toISOString()
      };
    }

    const result = await client.from("goals").update(payload).eq("id", id);
    setSavingId("");

    if (result.error) {
      setError(result.error.message);
      return;
    }
    await loadGoals();
  }

  async function deleteGoal(id: string) {
    const client = supabase;
    if (!client) return;

    setSavingId(id);
    setError("");
    const result = await client.from("goals").delete().eq("id", id);
    setSavingId("");

    if (result.error) {
      setError(result.error.message);
      return;
    }
    await loadGoals();
  }

  if (loading) return <section className="goals-panel"><p>جارٍ تحميل الأهداف...</p></section>;

  return (
    <section className="goals-panel">
      <div className="goals-panel-head">
        <div>
          <span className="section-label">الأهداف</span>
          <h2>أهداف الطفل</h2>
          <p>أنشئ هدفًا واضحًا، ثم حوّله إلى مهام يومية قابلة للمتابعة.</p>
        </div>
        <Link className="auth-submit link-submit goals-add-button" href={`/children/${studentId}/goals/new`}>إضافة هدف</Link>
      </div>

      {error && <p className="form-message error-message">تعذر تنفيذ العملية: {error}</p>}

      {goals.length === 0 ? (
        <div className="goals-empty-state"><span>🎯</span><h3>لا توجد أهداف بعد</h3><p>ابدأ بهدف تعليمي أو سلوكي أو مالي أو عيني.</p></div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const progress = Math.min(100, Math.max(0, Number(goal.progress || 0)));
            return (
              <article className="goal-card" key={goal.id}>
                <div className="goal-card-head">
                  <div>
                    <span className={`goal-status goal-status-${goal.status}`}>{statusLabels[goal.status] || goal.status}</span>
                    <h3>{goal.title || "هدف بدون عنوان"}</h3>
                    <p>{typeLabels[goal.goal_type] || goal.goal_type}</p>
                  </div>
                  {goal.due_date && <time>{goal.due_date}</time>}
                </div>

                {goal.description && <p className="goal-description">{goal.description}</p>}

                <div className="goal-facts">
                  <span><small>القيمة</small><strong>{goal.target_value ? `${goal.target_value} ر.س` : "غير محددة"}</strong></span>
                  <span><small>مساهمة الطفل</small><strong>{goal.child_contribution || 0} ر.س</strong></span>
                  <span><small>النقاط المطلوبة</small><strong>{goal.required_points || 0}</strong></span>
                </div>

                <div className="progress-row">
                  <div className="progress-row-head"><span>نسبة الإنجاز</span><strong>{progress}%</strong></div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>

                <div className="goal-actions">
                  {(goal.status === "approved" || goal.status === "paused" || goal.status === "pending") && (
                    <Link className="goal-task-link" href={`/children/${studentId}/tasks?goal=${goal.id}`}>تحويل إلى مهام</Link>
                  )}

                  {goal.status === "pending" && (
                    <>
                      <button type="button" disabled={savingId === goal.id} onClick={() => updateGoal(goal.id, { status: "approved" })}>موافقة</button>
                      <button className="secondary-goal-action" type="button" disabled={savingId === goal.id} onClick={() => updateGoal(goal.id, { status: "rejected" })}>رفض</button>
                    </>
                  )}

                  {goal.status === "approved" && (
                    <>
                      <button className="secondary-goal-action" type="button" disabled={savingId === goal.id} onClick={() => updateGoal(goal.id, { status: "paused" })}>إيقاف مؤقت</button>
                      <button className="secondary-goal-action" type="button" disabled={savingId === goal.id} onClick={() => updateGoal(goal.id, { progress: 100, status: "completed" })}>إكمال الهدف</button>
                    </>
                  )}

                  {goal.status === "paused" && <button type="button" disabled={savingId === goal.id} onClick={() => updateGoal(goal.id, { status: "approved" })}>استئناف الهدف</button>}

                  {(goal.status === "pending" || goal.status === "rejected") && (
                    <button className="danger-goal-action" type="button" disabled={savingId === goal.id} onClick={() => deleteGoal(goal.id)}>حذف</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
