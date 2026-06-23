"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

type ChildTab = "home" | "tasks" | "goals";

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

const taskIcons: Record<string, string> = {
  behavior: "🌟",
  educational: "📚",
  quran: "📖",
  home: "🏠",
  other: "✨"
};

const goalIcons: Record<string, string> = {
  educational: "🎓",
  behavioral: "🌱",
  financial: "💰",
  material: "🎁"
};

export default function ChildDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ChildDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<ChildTab>("home");
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

  const actionableTasks = useMemo(
    () => data?.tasks.filter((task) => task.status === "pending" || task.status === "rejected") || [],
    [data]
  );

  const waitingTasks = useMemo(
    () => data?.tasks.filter((task) => task.status === "submitted") || [],
    [data]
  );

  const currentGoal = useMemo(
    () => data?.goals.find((goal) => ["approved", "active", "paused"].includes(goal.status)) || data?.goals[0] || null,
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
    setSuccess("رائع! تم إرسال المهمة إلى ولي الأمر للمراجعة.");
    await loadDashboard();
  }

  function changeTab(tab: ChildTab) {
    setActiveTab(tab);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading || !data) return <main className="dashboard-loading">جارٍ تجهيز حساب الطفل...</main>;

  return (
    <main className="child-app-page child-app-refresh">
      <header className="child-app-header">
        <div><span className="section-label">حسابي</span><h1>مرحبًا {data.student.full_name} 👋</h1></div>
        <button className="quiet-button child-logout-button" type="button" onClick={logout}>خروج</button>
      </header>

      {error && <p className="form-message error-message floating-message">{error}</p>}
      {success && <p className="form-message success-message floating-message">{success}</p>}

      {activeTab === "home" && (
        <div className="child-tab-panel child-home-panel">
          <section className="child-hero-card playful-child-hero">
            <div className="hero-decoration hero-star">⭐</div>
            <div className="hero-decoration hero-rocket">🚀</div>
            <span>رحلتك اليوم</span>
            <h2>كل مهمة تنجزها تقربك من هدفك</h2>
            <p>أنجز، أرسل للمراجعة، واجمع نقاطك خطوة بخطوة.</p>
            <div className="child-hero-stats">
              <button type="button" onClick={() => changeTab("goals")}><span>⭐</span><strong>{data.student.points_balance || 0}</strong><small>نقطة</small></button>
              <button type="button" onClick={() => changeTab("tasks")}><span>✅</span><strong>{actionableTasks.length}</strong><small>مهام اليوم</small></button>
              <button type="button" onClick={() => changeTab("tasks")}><span>⏳</span><strong>{waitingTasks.length}</strong><small>تنتظر المراجعة</small></button>
            </div>
          </section>

          <section className="child-focus-card">
            <div className="child-section-head"><div><span className="section-label">الهدف القريب</span><h2>{currentGoal?.title || "اختر هدفك القادم"}</h2></div><span className="focus-goal-icon">{currentGoal ? goalIcons[currentGoal.goal_type] || "🎯" : "🌈"}</span></div>
            {currentGoal ? (
              <>
                <p>{currentGoal.description || "استمر في إنجاز مهامك للوصول إلى هذا الهدف."}</p>
                <div className="progress-row"><div className="progress-row-head"><span>تقدمك</span><strong>{currentGoal.progress || 0}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, Number(currentGoal.progress || 0)))}%` }} /></div></div>
                <button className="soft-action-button" type="button" onClick={() => changeTab("goals")}>عرض كل الأهداف</button>
              </>
            ) : (
              <button className="soft-action-button" type="button" onClick={() => { setActiveTab("goals"); setShowGoalForm(true); }}>طلب هدف جديد</button>
            )}
          </section>

          <section className="child-preview-section">
            <div className="child-section-head"><div><span className="section-label">مهام اليوم</span><h2>ابدأ بهذه المهام</h2></div><button type="button" onClick={() => changeTab("tasks")}>عرض الكل</button></div>
            {actionableTasks.length === 0 ? (
              <div className="child-friendly-empty"><span>🎉</span><strong>لا توجد مهام مطلوبة الآن</strong><p>استمتع بوقتك أو اطلب هدفًا جديدًا.</p></div>
            ) : (
              <div className="child-preview-grid">
                {actionableTasks.slice(0, 3).map((task) => (
                  <button className="preview-task-card" type="button" onClick={() => changeTab("tasks")} key={task.id}><span>{taskIcons[task.category] || "✨"}</span><div><strong>{task.title}</strong><small>{task.points} نقطة</small></div><b>←</b></button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "tasks" && (
        <section className="child-tab-panel child-goals-section child-tasks-section">
          <div className="child-section-head"><div><span className="section-label">مهامي</span><h2>المهام الحالية</h2><p>اختر المهمة، أنجزها، ثم أرسلها للمراجعة.</p></div><span className="section-color-icon">✅</span></div>
          {data.tasks.length === 0 ? (
            <div className="child-friendly-empty"><span>🌤️</span><strong>لا توجد مهام بعد</strong><p>سيُسند ولي الأمر المهام المرتبطة بأهدافك.</p></div>
          ) : (
            <div className="child-task-list">
              {data.tasks.map((task) => (
                <article className={`child-task-card interactive-child-card task-${task.status}`} key={task.id}>
                  <div className="child-task-head">
                    <span className={`task-round-icon category-${task.category}`}>{taskIcons[task.category] || "✨"}</span>
                    <div><span className={`task-status task-status-${task.status}`}>{taskStatusLabels[task.status] || task.status}</span><h3>{task.title}</h3><p>⭐ {task.points} نقطة</p></div>
                    {task.due_date && <time>{task.due_date}</time>}
                  </div>
                  {task.description && <p className="task-description">{task.description}</p>}
                  {task.review_note && <div className="task-note review"><strong>ملاحظة ولي الأمر</strong><p>{task.review_note}</p></div>}
                  {(task.status === "pending" || task.status === "rejected") && (
                    <div className="child-task-submit-box"><textarea rows={2} value={taskNotes[task.id] || ""} onChange={(event) => setTaskNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="اكتب ملاحظة بسيطة عن إنجازك" /><button type="button" disabled={busyTaskId === task.id} onClick={() => submitTask(task.id)}>{busyTaskId === task.id ? "جارٍ الإرسال..." : "تم الإنجاز ✓"}</button></div>
                  )}
                  {task.status === "submitted" && <div className="child-goal-note">⏳ تنتظر مراجعة ولي الأمر.</div>}
                  {task.status === "approved" && <div className="child-goal-note success">🎉 تمت إضافة {task.points} نقطة.</div>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "goals" && (
        <section className="child-tab-panel child-goals-section">
          <div className="child-section-head"><div><span className="section-label">أهدافي</span><h2>الأهداف الحالية</h2><p>تابع تقدمك أو اطلب هدفًا جديدًا.</p></div><button className="color-add-button" type="button" onClick={() => setShowGoalForm((value) => !value)}>{showGoalForm ? "إغلاق" : "+ هدف جديد"}</button></div>

          {showGoalForm && (
            <div className="child-goal-request-card embedded-goal-form"><h2>ما الهدف الذي تحلم به؟ 🌟</h2><form className="auth-form" onSubmit={requestGoal}><label>عنوان الهدف<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: أريد شراء دراجة" required /></label><label>الوصف<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="لماذا تريد هذا الهدف؟" /></label><label>نوع الهدف<select value={goalType} onChange={(event) => setGoalType(event.target.value)}><option value="educational">🎓 تعليمي</option><option value="behavioral">🌱 سلوكي</option><option value="financial">💰 مالي</option><option value="material">🎁 عيني</option></select></label><div className="form-grid-two"><label>القيمة المتوقعة<input type="number" min="0" step="0.01" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} /></label><label>النقاط المقترحة<input type="number" min="0" step="1" value={requiredPoints} onChange={(event) => setRequiredPoints(event.target.value)} /></label></div><label>التاريخ المقترح<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإرسال..." : "إرسال لولي الأمر"}</button></form></div>
          )}

          {data.goals.length === 0 ? (
            <div className="child-friendly-empty"><span>🌈</span><strong>لا توجد أهداف بعد</strong><p>ابدأ بطلب هدف جديد من ولي الأمر.</p></div>
          ) : (
            <div className="goals-list">
              {data.goals.map((goal) => {
                const progress = Math.min(100, Math.max(0, Number(goal.progress || 0)));
                return (
                  <article className="goal-card child-goal-card interactive-child-card" key={goal.id}>
                    <div className="goal-card-head"><div className="goal-title-with-icon"><span className={`goal-round-icon goal-${goal.goal_type}`}>{goalIcons[goal.goal_type] || "🎯"}</span><div><span className={`goal-status goal-status-${goal.status}`}>{goalStatusLabels[goal.status] || goal.status}</span><h3>{goal.title || "هدف بدون عنوان"}</h3></div></div>{goal.due_date && <time>{goal.due_date}</time>}</div>
                    {goal.description && <p className="goal-description">{goal.description}</p>}
                    <div className="progress-row"><div className="progress-row-head"><span>تقدمك</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
                    <div className="child-goal-note">✨ يتحدث التقدم بعد اعتماد المهام المرتبطة.</div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <nav className="child-bottom-nav" aria-label="التنقل الرئيسي للطفل">
        <button className={activeTab === "home" ? "active" : ""} type="button" onClick={() => changeTab("home")}><span>🏠</span><small>الرئيسية</small></button>
        <button className={activeTab === "tasks" ? "active" : ""} type="button" onClick={() => changeTab("tasks")}><span>✅</span><small>مهامي</small>{actionableTasks.length > 0 && <b>{actionableTasks.length}</b>}</button>
        <button className={activeTab === "goals" ? "active" : ""} type="button" onClick={() => changeTab("goals")}><span>🎯</span><small>أهدافي</small></button>
      </nav>
    </main>
  );
}
