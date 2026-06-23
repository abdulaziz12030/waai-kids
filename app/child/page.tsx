"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ChildGoal = {
  id: string;
  title: string | null;
  description: string | null;
  goal_type: string;
  status: string;
  progress: number | null;
  required_points: number | null;
  due_date: string | null;
};

type ChildTask = {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  category: string;
  points: number;
  status: string;
  due_date: string | null;
  child_note: string | null;
  review_note: string | null;
  submitted_at: string | null;
};

type ChildDashboardData = {
  student: {
    id: string;
    full_name: string;
    points_balance: number;
    profile_data?: Record<string, unknown> | null;
  };
  goals: ChildGoal[];
  tasks: ChildTask[];
};

const goalStatusLabels: Record<string, string> = {
  pending: "بانتظار موافقة ولي الأمر",
  approved: "نشط",
  active: "نشط",
  paused: "متوقف مؤقتًا",
  completed: "مكتمل"
};

const taskStatusLabels: Record<string, string> = {
  pending: "مطلوبة",
  submitted: "بانتظار المراجعة",
  approved: "معتمدة",
  rejected: "أعد المحاولة"
};

export default function ChildDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ChildDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState("educational");
  const [targetValue, setTargetValue] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [busyTaskId, setBusyTaskId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDashboard() {
    const client = supabase;
    if (!client) return;

    const token = localStorage.getItem("namaa_child_token");
    if (!token) {
      router.replace("/child/login");
      return;
    }

    const result = await client.rpc("get_child_dashboard", { p_session_token: token });
    if (result.error || !result.data) {
      localStorage.removeItem("namaa_child_token");
      localStorage.removeItem("namaa_child_name");
      router.replace("/child/login");
      return;
    }

    setData(result.data as ChildDashboardData);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const todayTasks = useMemo(
    () => data?.tasks.filter((task) => task.status === "pending" || task.status === "rejected") || [],
    [data]
  );

  const waitingTasks = useMemo(
    () => data?.tasks.filter((task) => task.status === "submitted") || [],
    [data]
  );

  function logout() {
    localStorage.removeItem("namaa_child_token");
    localStorage.removeItem("namaa_child_name");
    router.replace("/child/login");
  }

  async function requestGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) return;

    if (title.trim().length < 3) {
      setError("اكتب عنوانًا واضحًا للهدف.");
      return;
    }

    setSaving(true);
    const result = await client.rpc("child_request_goal", {
      p_session_token: token,
      p_title: title.trim(),
      p_description: description.trim(),
      p_goal_type: goalType,
      p_target_value: targetValue ? Number(targetValue) : null,
      p_required_points: Number(requiredPoints || 0),
      p_due_date: dueDate || null
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setTitle("");
    setDescription("");
    setGoalType("educational");
    setTargetValue("");
    setRequiredPoints("0");
    setDueDate("");
    setShowGoalForm(false);
    setSuccess("تم إرسال الهدف إلى ولي الأمر للموافقة.");
    await loadDashboard();
  }

  async function submitTask(taskId: string) {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) return;

    setBusyTaskId(taskId);
    setError("");
    setSuccess("");
    const result = await client.rpc("child_submit_task", {
      p_session_token: token,
      p_task_id: taskId,
      p_child_note: taskNotes[taskId] || ""
    });
    setBusyTaskId("");

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setTaskNotes((current) => ({ ...current, [taskId]: "" }));
    setSuccess("تم إرسال المهمة إلى ولي الأمر للمراجعة.");
    await loadDashboard();
  }

  if (loading || !data) return <main className="dashboard-loading">جارٍ تجهيز حساب الطفل...</main>;

  return (
    <main className="child-app-page">
      <header className="child-app-header">
        <div><span className="section-label">حساب الطفل</span><h1>مرحبًا {data.student.full_name}</h1></div>
        <button className="quiet-button" type="button" onClick={logout}>تسجيل الخروج</button>
      </header>

      <section className="child-hero-card">
        <span>رحلتك في نماء</span>
        <h2>أنجز مهامك واقترب من هدفك</h2>
        <p>نفّذ المهمة، أرسلها للمراجعة، وبعد اعتماد ولي الأمر تُضاف نقاطك ويتحدث تقدم هدفك.</p>
        <div className="child-hero-stats">
          <strong>{data.student.points_balance || 0}<small>نقطة</small></strong>
          <strong>{todayTasks.length}<small>مهام مطلوبة</small></strong>
          <strong>{waitingTasks.length}<small>تنتظر المراجعة</small></strong>
        </div>
        <button type="button" onClick={() => setShowGoalForm((value) => !value)}>{showGoalForm ? "إغلاق النموذج" : "طلب هدف جديد"}</button>
      </section>

      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      <section className="child-goals-section child-tasks-section">
        <div className="child-section-head"><div><span className="section-label">مهامي</span><h2>المهام الحالية</h2></div></div>

        {data.tasks.length === 0 ? (
          <div className="goals-empty-state"><span>✅</span><h3>لا توجد مهام بعد</h3><p>سيُسند ولي الأمر المهام المرتبطة بأهدافك.</p></div>
        ) : (
          <div className="child-task-list">
            {data.tasks.map((task) => (
              <article className={`child-task-card task-${task.status}`} key={task.id}>
                <div className="child-task-head">
                  <div><span className={`task-status task-status-${task.status}`}>{taskStatusLabels[task.status] || task.status}</span><h3>{task.title}</h3><p>{task.points} نقطة</p></div>
                  {task.due_date && <time>{task.due_date}</time>}
                </div>
                {task.description && <p className="task-description">{task.description}</p>}
                {task.review_note && <div className="task-note review"><strong>ملاحظة ولي الأمر</strong><p>{task.review_note}</p></div>}
                {(task.status === "pending" || task.status === "rejected") && (
                  <div className="child-task-submit-box">
                    <textarea rows={2} value={taskNotes[task.id] || ""} onChange={(event) => setTaskNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="اكتب ملاحظة بسيطة عن إنجازك" />
                    <button type="button" disabled={busyTaskId === task.id} onClick={() => submitTask(task.id)}>{busyTaskId === task.id ? "جارٍ الإرسال..." : "تم الإنجاز وإرسال للمراجعة"}</button>
                  </div>
                )}
                {task.status === "submitted" && <div className="child-goal-note">تم إرسال المهمة، وتنتظر مراجعة ولي الأمر.</div>}
                {task.status === "approved" && <div className="child-goal-note success">تم اعتماد المهمة وإضافة {task.points} نقطة.</div>}
              </article>
            ))}
          </div>
        )}
      </section>

      {showGoalForm && (
        <section className="child-goal-request-card">
          <h2>اطلب هدفًا جديدًا</h2>
          <form className="auth-form" onSubmit={requestGoal}>
            <label>عنوان الهدف<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: أريد شراء دراجة" required /></label>
            <label>الوصف<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="لماذا تريد هذا الهدف؟" /></label>
            <label>نوع الهدف<select value={goalType} onChange={(event) => setGoalType(event.target.value)}><option value="educational">تعليمي</option><option value="behavioral">سلوكي</option><option value="financial">مالي</option><option value="material">عيني</option></select></label>
            <div className="form-grid-two">
              <label>القيمة المتوقعة<input type="number" min="0" step="0.01" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} /></label>
              <label>النقاط المقترحة<input type="number" min="0" step="1" value={requiredPoints} onChange={(event) => setRequiredPoints(event.target.value)} /></label>
            </div>
            <label>التاريخ المقترح<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإرسال..." : "إرسال لولي الأمر"}</button>
          </form>
        </section>
      )}

      <section className="child-goals-section">
        <div className="child-section-head"><div><span className="section-label">أهدافي</span><h2>الأهداف الحالية</h2></div></div>
        {data.goals.length === 0 ? (
          <div className="goals-empty-state"><span>🎯</span><h3>لا توجد أهداف بعد</h3><p>ابدأ بطلب هدف جديد من ولي الأمر.</p></div>
        ) : (
          <div className="goals-list">
            {data.goals.map((goal) => {
              const progress = Math.min(100, Math.max(0, Number(goal.progress || 0)));
              return (
                <article className="goal-card child-goal-card" key={goal.id}>
                  <div className="goal-card-head"><div><span className={`goal-status goal-status-${goal.status}`}>{goalStatusLabels[goal.status] || goal.status}</span><h3>{goal.title || "هدف بدون عنوان"}</h3></div>{goal.due_date && <time>{goal.due_date}</time>}</div>
                  {goal.description && <p className="goal-description">{goal.description}</p>}
                  <div className="progress-row"><div className="progress-row-head"><span>التقدم</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
                  <div className="child-goal-note">يتحدث التقدم بعد اعتماد ولي الأمر للمهام المرتبطة.</div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="child-app-footer"><Link href="/">عن نماء</Link><span>حساب محدود وآمن للطفل</span></footer>
    </main>
  );
}
