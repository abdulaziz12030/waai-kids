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
  target_value: number | null;
  start_date: string | null;
  due_date: string | null;
  decision_note: string | null;
  task_plan_mode: string | null;
  task_plan_count: number | null;
  reward_status: string | null;
  reward_paid_amount: number | null;
  reward_granted_at: string | null;
  reward_grant_note: string | null;
};

type ChildTask = {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  achievement_points: number;
  reward_points: number;
  status: string;
  starts_on: string | null;
  due_date: string | null;
  plan_step: number | null;
  plan_total: number | null;
  generated_from_goal: boolean;
  child_note: string | null;
  review_note: string | null;
  submitted_at: string | null;
};

type ChildLevel = {
  code: string;
  name: string;
  icon: string;
  min: number;
};

type ChildDashboardData = {
  student: {
    id: string;
    full_name: string;
    achievement_points: number;
    reward_points: number;
    level: ChildLevel;
    profile_data?: Record<string, unknown> | null;
  };
  goals: ChildGoal[];
  tasks: ChildTask[];
};

type ChildTab = "home" | "tasks" | "goals";

type TaskGroup = {
  key: string;
  goal: ChildGoal | null;
  tasks: ChildTask[];
};

const goalStatusLabels: Record<string, string> = {
  requested: "بانتظار موافقة ولي الأمر",
  pending: "بانتظار موافقة ولي الأمر",
  approved: "نشط",
  active: "نشط",
  paused: "متوقف مؤقتًا",
  completed: "مكتمل",
  rejected: "لم تتم الموافقة"
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

const planModeLabels: Record<string, string> = {
  single: "مهمة واحدة",
  daily: "خطة يومية",
  weekly: "خطة أسبوعية",
  milestones: "خطة مراحل"
};

function localDateIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function isBlockedByPrevious(task: ChildTask, groupTasks: ChildTask[]) {
  const currentStep = task.plan_step;
  if (!task.generated_from_goal || !currentStep || currentStep <= 1) return false;
  return groupTasks.some((previous) =>
    Boolean(previous.plan_step && previous.plan_step < currentStep && previous.status !== "approved")
  );
}

function isTaskActionable(task: ChildTask, groupTasks: ChildTask[], today: string) {
  if (task.status !== "pending" && task.status !== "rejected") return false;
  if (task.starts_on && task.starts_on > today) return false;
  return !isBlockedByPrevious(task, groupTasks);
}

function isUpcomingTask(task: ChildTask, groupTasks: ChildTask[], today: string) {
  if (task.status === "approved" || task.status === "submitted") return false;
  const future = Boolean(task.starts_on && task.starts_on > today);
  return future || isBlockedByPrevious(task, groupTasks);
}

function taskFriendlyError(message?: string) {
  if (!message) return "تعذر إرسال المهمة الآن.";
  if (message.includes("لم يحن وقت")) return "هذه المرحلة ستفتح في تاريخ بدايتها.";
  if (message.includes("المرحلة السابقة")) return "أكمل المرحلة السابقة وانتظر اعتماد ولي الأمر أولًا.";
  return "تعذر إرسال المهمة الآن. حاول مرة أخرى.";
}

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
  const today = localDateIso();

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

  const taskGroups = useMemo<TaskGroup[]>(() => {
    if (!data) return [];
    const groups = new Map<string, TaskGroup>();

    for (const task of data.tasks) {
      const key = task.goal_id || "general";
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          goal: task.goal_id ? data.goals.find((goal) => goal.id === task.goal_id) || null : null,
          tasks: []
        });
      }
      groups.get(key)?.tasks.push(task);
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      tasks: [...group.tasks].sort((a, b) => {
        const stepDifference = Number(a.plan_step || 9999) - Number(b.plan_step || 9999);
        if (stepDifference !== 0) return stepDifference;
        return String(a.starts_on || "").localeCompare(String(b.starts_on || ""));
      })
    }));
  }, [data]);

  const actionableTasks = useMemo(
    () => taskGroups.flatMap((group) => group.tasks.filter((task) => isTaskActionable(task, group.tasks, today))),
    [taskGroups, today]
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
      setError("تعذر إرسال الهدف الآن.");
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
      setError(taskFriendlyError(result.error.message));
      return;
    }

    setTaskNotes((current) => ({ ...current, [taskId]: "" }));
    setSuccess("رائع! تم إرسال المرحلة إلى ولي الأمر للمراجعة.");
    await loadDashboard();
  }

  function changeTab(tab: ChildTab) {
    setActiveTab(tab);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderTaskCard(task: ChildTask, groupTasks: ChildTask[]) {
    const future = Boolean(task.starts_on && task.starts_on > today);
    const blocked = isBlockedByPrevious(task, groupTasks);
    const actionable = isTaskActionable(task, groupTasks, today);
    const locked = (future || blocked) && task.status !== "approved" && task.status !== "submitted";

    return (
      <article className={`child-task-card interactive-child-card task-${task.status} ${locked ? "task-locked" : ""} ${actionable ? "task-current" : ""}`} key={task.id}>
        <div className="child-task-head">
          <span className={`task-round-icon category-${task.category}`}>{locked ? "🔒" : taskIcons[task.category] || "✨"}</span>
          <div>
            <div className="task-stage-row"><span className={`task-status task-status-${task.status}`}>{locked ? "قادمة" : taskStatusLabels[task.status] || task.status}</span>{task.plan_step && <b>المرحلة {task.plan_step} من {task.plan_total}</b>}</div>
            <h3>{task.title}</h3>
            <p>{task.achievement_points} ⭐ إنجاز · {task.reward_points} 💎 مكافآت</p>
          </div>
          {task.due_date && <time>{formatDate(task.due_date)}</time>}
        </div>

        {(task.starts_on || task.due_date) && <div className="task-period-line"><span>📅</span><strong>{task.starts_on === task.due_date ? formatDate(task.due_date) : `${formatDate(task.starts_on)} — ${formatDate(task.due_date)}`}</strong></div>}
        {task.description && <p className="task-description">{task.description}</p>}
        {task.review_note && <div className="task-note review"><strong>ملاحظة ولي الأمر</strong><p>{task.review_note}</p></div>}

        {actionable && (
          <div className="child-task-submit-box"><textarea rows={2} value={taskNotes[task.id] || ""} onChange={(event) => setTaskNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="اكتب ماذا أنجزت في هذه المرحلة" /><button type="button" disabled={busyTaskId === task.id} onClick={() => submitTask(task.id)}>{busyTaskId === task.id ? "جارٍ الإرسال..." : "أنجزت المرحلة ✓"}</button></div>
        )}
        {future && task.status !== "approved" && <div className="child-goal-note task-lock-note">🔒 تفتح في {formatDate(task.starts_on)}.</div>}
        {!future && blocked && task.status !== "approved" && <div className="child-goal-note task-lock-note">🔒 تفتح بعد اعتماد المرحلة السابقة.</div>}
        {task.status === "submitted" && <div className="child-goal-note">⏳ أرسلتها، وتنتظر الآن اعتماد ولي الأمر.</div>}
        {task.status === "approved" && <div className="child-goal-note success">🎉 تم اعتماد المرحلة وإضافة {task.achievement_points} ⭐ و{task.reward_points} 💎.</div>}
      </article>
    );
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
            <span>{data.student.level.icon} مستوى {data.student.level.name}</span>
            <h2>كل مرحلة تنجزها تقربك من مكافأتك</h2>
            <p>نفّذ مهمة اليوم أو هذا الأسبوع، ثم أرسلها لولي الأمر حتى يعتمدها وتفتح المرحلة التالية.</p>
            <div className="child-hero-stats dual-child-stats">
              <button type="button" onClick={() => changeTab("goals")}><span>⭐</span><strong>{data.student.achievement_points || 0}</strong><small>نقاط الإنجاز</small></button>
              <button type="button" onClick={() => changeTab("goals")}><span>💎</span><strong>{data.student.reward_points || 0}</strong><small>نقاط المكافآت</small></button>
              <button type="button" onClick={() => changeTab("tasks")}><span>✅</span><strong>{actionableTasks.length}</strong><small>متاحة الآن</small></button>
            </div>
          </section>

          <section className="child-level-card">
            <div className="level-icon">{data.student.level.icon}</div>
            <div><span className="section-label">مستواي الحالي</span><h2>{data.student.level.name}</h2><p>استمر في جمع نقاط الإنجاز للانتقال إلى المستوى التالي.</p></div>
            <strong>{data.student.achievement_points} ⭐</strong>
          </section>

          <section className="child-focus-card">
            <div className="child-section-head"><div><span className="section-label">الهدف القريب</span><h2>{currentGoal?.title || "اختر هدفك القادم"}</h2></div><span className="focus-goal-icon">{currentGoal ? goalIcons[currentGoal.goal_type] || "🎯" : "🌈"}</span></div>
            {currentGoal ? (
              <>
                <p>{currentGoal.description || "استمر في تنفيذ مراحل الخطة للوصول إلى هذا الهدف."}</p>
                <div className="progress-row"><div className="progress-row-head"><span>تقدم تنفيذ الخطة</span><strong>{currentGoal.progress || 0}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, Number(currentGoal.progress || 0)))}%` }} /></div></div>
                <button className="soft-action-button" type="button" onClick={() => changeTab("goals")}>عرض كل الأهداف</button>
              </>
            ) : (
              <button className="soft-action-button" type="button" onClick={() => { setActiveTab("goals"); setShowGoalForm(true); }}>طلب هدف جديد</button>
            )}
          </section>

          <section className="child-preview-section">
            <div className="child-section-head"><div><span className="section-label">المتاح الآن</span><h2>ابدأ بهذه المرحلة</h2></div><button type="button" onClick={() => changeTab("tasks")}>عرض الخطة</button></div>
            {actionableTasks.length === 0 ? (
              <div className="child-friendly-empty"><span>🎉</span><strong>لا توجد مرحلة مطلوبة الآن</strong><p>قد تكون بانتظار اعتماد ولي الأمر أو موعد المرحلة القادمة.</p></div>
            ) : (
              <div className="child-preview-grid">
                {actionableTasks.slice(0, 3).map((task) => (
                  <button className="preview-task-card" type="button" onClick={() => changeTab("tasks")} key={task.id}><span>{taskIcons[task.category] || "✨"}</span><div><strong>{task.title}</strong><small>{task.plan_step ? `المرحلة ${task.plan_step} من ${task.plan_total}` : "مهمة مستقلة"} · {task.achievement_points} ⭐ + {task.reward_points} 💎</small></div><b>←</b></button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "tasks" && (
        <section className="child-tab-panel child-goals-section child-tasks-section child-plan-workspace">
          <div className="child-section-head"><div><span className="section-label">خطتي</span><h2>المهام اليومية والأسبوعية</h2><p>نفّذ المرحلة المتاحة، وانتظر اعتماد ولي الأمر قبل الانتقال لما بعدها.</p></div><span className="section-color-icon">🗓️</span></div>
          {taskGroups.length === 0 ? (
            <div className="child-friendly-empty"><span>🌤️</span><strong>لا توجد خطة بعد</strong><p>سيحوّل ولي الأمر هدفك إلى مهام موزعة حسب الأيام أو الأسابيع.</p></div>
          ) : (
            <div className="child-plan-groups">
              {taskGroups.map((group) => {
                const approvedCount = group.tasks.filter((task) => task.status === "approved").length;
                const planProgress = group.tasks.length ? Math.round((approvedCount / group.tasks.length) * 100) : 0;
                const upcomingTasks = group.tasks.filter((task) => isUpcomingTask(task, group.tasks, today));
                const visibleTasks = group.tasks.filter((task) => !isUpcomingTask(task, group.tasks, today));
                const firstUpcomingDate = upcomingTasks.find((task) => task.starts_on)?.starts_on || null;

                return (
                  <section className="child-plan-group" key={group.key}>
                    <div className="child-plan-header">
                      <div><span>{group.goal?.task_plan_mode ? planModeLabels[group.goal.task_plan_mode] || "خطة هدف" : group.goal ? "مهام الهدف" : "مهام عامة"}</span><h3>{group.goal?.title || "مهام مستقلة"}</h3><p>{approvedCount} من {group.tasks.length} مراحل معتمدة</p></div>
                      <strong>{planProgress}%</strong>
                    </div>
                    <div className="child-plan-progress"><span style={{ width: `${planProgress}%` }} /></div>

                    {visibleTasks.length > 0 && (
                      <div className="child-task-list child-plan-task-list">
                        {visibleTasks.map((task) => renderTaskCard(task, group.tasks))}
                      </div>
                    )}

                    {upcomingTasks.length > 0 && (
                      <details className="child-upcoming-tasks-fold">
                        <summary>
                          <div className="child-upcoming-summary-main"><span>🔒</span><div><strong>المهام القادمة</strong><small>{firstUpcomingDate ? `أقرب مرحلة تبدأ ${formatDate(firstUpcomingDate)}` : "تفتح بعد اعتماد المرحلة السابقة"}</small></div></div>
                          <div className="child-upcoming-summary-side"><b>{upcomingTasks.length}</b><span className="child-upcoming-chevron">⌄</span></div>
                        </summary>
                        <p className="child-upcoming-hint">هذه المراحل مطوية حتى تظل خطتك مرتبة. اضغط لعرض تفاصيلها.</p>
                        <div className="child-task-list child-plan-task-list child-upcoming-task-list">
                          {upcomingTasks.map((task) => renderTaskCard(task, group.tasks))}
                        </div>
                      </details>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "goals" && (
        <section className="child-tab-panel child-goals-section">
          <div className="child-section-head"><div><span className="section-label">أهدافي</span><h2>الأهداف الحالية</h2><p>تابع تقدم خطتك ومكافأة كل هدف.</p></div><button className="color-add-button" type="button" onClick={() => setShowGoalForm((value) => !value)}>{showGoalForm ? "إغلاق" : "+ هدف جديد"}</button></div>

          {showGoalForm && (
            <div className="child-goal-request-card embedded-goal-form"><h2>ما الهدف الذي تحلم به؟ 🌟</h2><form className="auth-form" onSubmit={requestGoal}><label>عنوان الهدف<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: أريد شراء دراجة" required /></label><label>الوصف<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="لماذا تريد هذا الهدف؟" /></label><label>نوع الهدف<select value={goalType} onChange={(event) => setGoalType(event.target.value)}><option value="educational">🎓 تعليمي</option><option value="behavioral">🌱 سلوكي</option><option value="financial">💰 مالي</option><option value="material">🎁 عيني</option></select></label><div className="form-grid-two"><label>القيمة المتوقعة<input type="number" min="0" step="0.01" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} /></label><label>نقاط المكافآت المطلوبة<input type="number" min="0" step="1" value={requiredPoints} onChange={(event) => setRequiredPoints(event.target.value)} /></label></div><label>التاريخ المقترح<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإرسال..." : "إرسال لولي الأمر"}</button></form></div>
          )}

          {data.goals.length === 0 ? (
            <div className="child-friendly-empty"><span>🌈</span><strong>لا توجد أهداف بعد</strong><p>ابدأ بطلب هدف جديد من ولي الأمر.</p></div>
          ) : (
            <div className="goals-list">
              {data.goals.map((goal) => {
                const progress = Math.min(100, Math.max(0, Number(goal.progress || 0)));
                const rewardPaid = goal.reward_status === "paid";
                const rewardDue = goal.status === "completed" && !rewardPaid;
                return (
                  <article className="goal-card child-goal-card interactive-child-card" key={goal.id}>
                    <div className="goal-card-head"><div className="goal-title-with-icon"><span className={`goal-round-icon goal-${goal.goal_type}`}>{goalIcons[goal.goal_type] || "🎯"}</span><div><span className={`goal-status goal-status-${goal.status}`}>{goalStatusLabels[goal.status] || goal.status}</span><h3>{goal.title || "هدف بدون عنوان"}</h3></div></div>{goal.due_date && <time>{formatDate(goal.due_date)}</time>}</div>
                    {goal.description && <p className="goal-description">{goal.description}</p>}
                    {goal.task_plan_count ? <div className="child-plan-pill">🗓️ {planModeLabels[goal.task_plan_mode || ""] || "خطة مهام"} · {goal.task_plan_count} مراحل</div> : null}
                    <div className="progress-row"><div className="progress-row-head"><span>تقدم تنفيذ الخطة</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
                    {goal.status === "rejected" && <div className="child-goal-note rejected">💬 {goal.decision_note || "يمكنك مناقشة الهدف مع ولي الأمر وتعديله."}</div>}
                    {rewardDue && <div className="child-reward-celebration"><span>🏆</span><div><strong>أكملت جميع المراحل!</strong><p>أصبحت المكافأة مستحقة وتنتظر تسليمها من ولي الأمر.</p></div></div>}
                    {rewardPaid && <div className="child-reward-celebration paid"><span>🎁</span><div><strong>تم منحك المكافأة</strong><p>{goal.reward_grant_note || (goal.reward_paid_amount ? `قيمة المكافأة ${goal.reward_paid_amount} ر.س` : "مبارك لك إكمال الهدف!")}</p></div></div>}
                    {!rewardDue && !rewardPaid && goal.status !== "rejected" && <div className="child-goal-note">✅ كل مرحلة يعتمدها ولي الأمر ترفع تقدمك نحو المكافأة.</div>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <nav className="child-bottom-nav" aria-label="التنقل الرئيسي للطفل">
        <button className={activeTab === "home" ? "active" : ""} type="button" onClick={() => changeTab("home")}><span>🏠</span><small>الرئيسية</small></button>
        <button className={activeTab === "tasks" ? "active" : ""} type="button" onClick={() => changeTab("tasks")}><span>✅</span><small>خطتي</small>{actionableTasks.length > 0 && <b>{actionableTasks.length}</b>}</button>
        <button className={activeTab === "goals" ? "active" : ""} type="button" onClick={() => changeTab("goals")}><span>🎯</span><small>أهدافي</small></button>
      </nav>
    </main>
  );
}
