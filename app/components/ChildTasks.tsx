"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type GoalOption = {
  id: string;
  title: string;
  status: string;
};

type Task = {
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
  approved_at: string | null;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  pending: "بانتظار الطفل",
  submitted: "بانتظار المراجعة",
  approved: "معتمدة",
  rejected: "تحتاج إعادة"
};

const categoryLabels: Record<string, string> = {
  behavior: "سلوكية",
  educational: "تعليمية",
  quran: "قرآن",
  home: "منزلية",
  other: "أخرى"
};

export default function ChildTasks({ studentId }: { studentId: string }) {
  const searchParams = useSearchParams();
  const goalFromUrl = searchParams.get("goal") || "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [goalId, setGoalId] = useState(goalFromUrl);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("behavior");
  const [points, setPoints] = useState("10");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState("once");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    const client = supabase;
    if (!client) return;

    setLoading(true);
    const [taskResult, goalResult] = await Promise.all([
      client.rpc("get_parent_child_tasks", { p_student_id: studentId }),
      client
        .from("goals")
        .select("id, title, status")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
    ]);

    if (taskResult.error) setError(taskResult.error.message);
    else setTasks(taskResult.data || []);

    if (!goalResult.error) setGoals(goalResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [studentId]);

  useEffect(() => {
    if (goalFromUrl) setGoalId(goalFromUrl);
  }, [goalFromUrl]);

  const submittedCount = useMemo(
    () => tasks.filter((task) => task.status === "submitted").length,
    [tasks]
  );

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (title.trim().length < 3) {
      setError("اكتب عنوانًا واضحًا للمهمة.");
      return;
    }

    const client = supabase;
    if (!client) return;

    setSaving(true);
    const result = await client.rpc("create_task_for_child", {
      p_student_id: studentId,
      p_goal_id: goalId || null,
      p_title: title.trim(),
      p_description: description.trim(),
      p_category: category,
      p_points: Number(points || 0),
      p_due_date: dueDate || null,
      p_recurrence: recurrence
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("behavior");
    setPoints("10");
    setDueDate("");
    setRecurrence("once");
    setSuccess("تم إسناد المهمة وستظهر في حساب الطفل.");
    await loadData();
  }

  async function reviewTask(taskId: string, decision: "approved" | "rejected") {
    const client = supabase;
    if (!client) return;

    setBusyId(taskId);
    setError("");
    const result = await client.rpc("review_child_task", {
      p_task_id: taskId,
      p_decision: decision,
      p_review_note: reviewNotes[taskId] || ""
    });
    setBusyId("");

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setReviewNotes((current) => ({ ...current, [taskId]: "" }));
    setSuccess(decision === "approved" ? "تم اعتماد المهمة وإضافة النقاط." : "تمت إعادة المهمة للطفل مع الملاحظة.");
    await loadData();
  }

  if (loading) return <section className="goals-panel"><p>جارٍ تحميل المهام...</p></section>;

  return (
    <section className="tasks-workspace">
      <div className="tasks-summary-card">
        <div><span className="section-label">المهام والنقاط</span><h1>إسناد ومراجعة المهام</h1><p>اربط المهمة بهدف، ثم يعتمد الطفل الإنجاز ويُراجع ولي الأمر النتيجة.</p></div>
        <strong>{submittedCount}<small>تنتظر المراجعة</small></strong>
      </div>

      <div className="tasks-layout">
        <section className="task-create-card">
          <h2>مهمة جديدة</h2>
          <form className="auth-form" onSubmit={createTask}>
            <label>الهدف المرتبط<select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">مهمة عامة بدون هدف</option>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>
            <label>عنوان المهمة<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: قراءة 20 دقيقة" required /></label>
            <label>الوصف<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="اشرح المطلوب للطفل" /></label>
            <div className="form-grid-two">
              <label>التصنيف<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="behavior">سلوكية</option><option value="educational">تعليمية</option><option value="quran">قرآن</option><option value="home">منزلية</option><option value="other">أخرى</option></select></label>
              <label>النقاط<input type="number" min="0" step="1" value={points} onChange={(event) => setPoints(event.target.value)} /></label>
            </div>
            <div className="form-grid-two">
              <label>تاريخ الاستحقاق<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
              <label>التكرار<select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}><option value="once">مرة واحدة</option><option value="daily">يومي</option><option value="weekly">أسبوعي</option></select></label>
            </div>
            {error && <p className="form-message error-message">{error}</p>}
            {success && <p className="form-message success-message">{success}</p>}
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإسناد..." : "إسناد المهمة"}</button>
          </form>
        </section>

        <section className="task-list-card">
          <div className="task-list-head"><div><span className="section-label">المتابعة</span><h2>مهام الطفل</h2></div></div>
          {tasks.length === 0 ? <div className="goals-empty-state"><span>✅</span><h3>لا توجد مهام بعد</h3><p>أنشئ أول مهمة من النموذج المجاور.</p></div> : (
            <div className="parent-task-list">
              {tasks.map((task) => (
                <article className={`parent-task-card task-${task.status}`} key={task.id}>
                  <div className="parent-task-head"><div><span className={`task-status task-status-${task.status}`}>{statusLabels[task.status] || task.status}</span><h3>{task.title}</h3><p>{categoryLabels[task.category] || task.category} · {task.points} نقطة</p></div>{task.due_date && <time>{task.due_date}</time>}</div>
                  {task.description && <p className="task-description">{task.description}</p>}
                  {task.child_note && <div className="task-note"><strong>ملاحظة الطفل</strong><p>{task.child_note}</p></div>}
                  {task.review_note && <div className="task-note review"><strong>ملاحظة ولي الأمر</strong><p>{task.review_note}</p></div>}
                  {task.status === "submitted" && <div className="task-review-box"><textarea rows={2} value={reviewNotes[task.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="ملاحظة اختيارية للطفل" /><div><button disabled={busyId === task.id} onClick={() => reviewTask(task.id, "approved")}>اعتماد وإضافة النقاط</button><button className="task-reject-button" disabled={busyId === task.id} onClick={() => reviewTask(task.id, "rejected")}>إعادة للطفل</button></div></div>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
