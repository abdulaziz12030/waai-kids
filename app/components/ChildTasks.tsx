"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type GoalOption = {
  id: string;
  title: string;
  status: string;
  target_value: number | null;
  progress: number | null;
  task_plan_mode: string | null;
  task_plan_count: number | null;
};

type RewardSummary = {
  goal_id: string;
  status: string;
  paid_amount: number | null;
  granted_at: string | null;
  grant_note: string | null;
};

type Task = {
  id: string;
  goal_id: string | null;
  goal_title: string | null;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  points: number;
  achievement_points: number;
  reward_points: number;
  points_mode: string;
  status: string;
  starts_on: string | null;
  due_date: string | null;
  plan_step: number | null;
  plan_total: number | null;
  generated_from_goal: boolean;
  child_note: string | null;
  review_note: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
};

type TaskGroup = {
  key: string;
  goal: GoalOption | null;
  tasks: Task[];
};

type VisibleTaskGroup = TaskGroup & {
  allTasks: Task[];
  showReward: boolean;
};

type TaskFilter = "followup" | "active" | "upcoming" | "completed" | "all";

const statusLabels: Record<string, string> = {
  pending: "بانتظار الطفل",
  submitted: "بانتظار اعتمادك",
  approved: "معتمدة",
  rejected: "أعيدت للطفل"
};

const categoryLabels: Record<string, string> = {
  behavior: "سلوكية",
  educational: "تعليمية",
  quran: "قرآن",
  home: "منزلية",
  other: "أخرى"
};

const difficultyLabels: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  major: "إنجاز كبير"
};

const planModeLabels: Record<string, string> = {
  single: "مهمة واحدة",
  daily: "خطة يومية",
  weekly: "خطة أسبوعية",
  milestones: "خطة مراحل"
};

const filterLabels: Array<{ id: TaskFilter; label: string; icon: string }> = [
  { id: "followup", label: "تحتاج متابعتي", icon: "🔔" },
  { id: "active", label: "قيد التنفيذ", icon: "▶️" },
  { id: "upcoming", label: "قادمة", icon: "🗓️" },
  { id: "completed", label: "مكتملة", icon: "✅" },
  { id: "all", label: "الكل", icon: "📋" }
];

function localDateIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function friendlyRewardError(message?: string) {
  if (!message) return "تعذر منح المكافأة الآن.";
  if (message.includes("لم تكتمل")) return "لا يمكن منح المكافأة قبل اعتماد جميع مراحل الخطة.";
  if (message.includes("غير معتمدة")) return "لا تزال هناك مراحل لم تعتمد بعد.";
  return "تعذر منح المكافأة الآن. حاول مرة أخرى.";
}

function taskBucket(task: Task, today: string): Exclude<TaskFilter, "all"> {
  if (task.status === "approved") return "completed";
  if (task.status === "submitted") return "followup";
  if (task.starts_on && task.starts_on > today) return "upcoming";
  if (task.due_date && task.due_date <= today) return "followup";
  return "active";
}

function followupReason(task: Task, today: string) {
  if (task.status === "submitted") return "أرسل الطفل إنجازه وتنتظر قرارك.";
  if (task.status === "rejected") return "أعيدت للطفل ولم تُستكمل بعد.";
  if (task.due_date && task.due_date < today) return "تجاوزت موعدها ولم يرسل الطفل الإنجاز.";
  if (task.due_date === today) return "موعد هذه المهمة اليوم.";
  return "تحتاج مراجعة منك.";
}

export default function ChildTasks({ studentId }: { studentId: string }) {
  const searchParams = useSearchParams();
  const goalFromUrl = searchParams.get("goal") || "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [rewards, setRewards] = useState<Record<string, RewardSummary>>({});
  const [goalId, setGoalId] = useState(goalFromUrl);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("behavior");
  const [difficulty, setDifficulty] = useState("medium");
  const [pointsMode, setPointsMode] = useState<"automatic" | "manual">("automatic");
  const [achievementPoints, setAchievementPoints] = useState("10");
  const [rewardPoints, setRewardPoints] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState("once");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [rewardNotes, setRewardNotes] = useState<Record<string, string>>({});
  const [rewardAmounts, setRewardAmounts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<TaskFilter>("followup");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [busyGoalId, setBusyGoalId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const today = localDateIso();

  async function loadData() {
    const client = supabase;
    if (!client) return;

    setLoading(true);
    const [taskResult, goalResult, rewardResult] = await Promise.all([
      client.rpc("get_parent_child_tasks_v2", { p_student_id: studentId }),
      client
        .from("goals")
        .select("id, title, status, target_value, progress, task_plan_mode, task_plan_count")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      client
        .from("rewards")
        .select("goal_id, status, paid_amount, granted_at, grant_note")
        .eq("student_id", studentId)
        .not("goal_id", "is", null)
    ]);

    if (taskResult.error) setError("تعذر تحميل المهام الآن.");
    else setTasks((taskResult.data || []) as Task[]);

    if (!goalResult.error) {
      const nextGoals = (goalResult.data || []) as GoalOption[];
      setGoals(nextGoals);
      setRewardAmounts((current) => {
        const next = { ...current };
        for (const goal of nextGoals) {
          if (next[goal.id] === undefined) next[goal.id] = goal.target_value ? String(goal.target_value) : "0";
        }
        return next;
      });
    }

    if (!rewardResult.error) {
      const nextRewards: Record<string, RewardSummary> = {};
      for (const reward of rewardResult.data || []) {
        if (reward.goal_id) nextRewards[reward.goal_id] = reward as RewardSummary;
      }
      setRewards(nextRewards);
    }
    setLoading(false);
  }

  async function loadSuggestedPoints(nextCategory = category, nextDifficulty = difficulty) {
    if (pointsMode !== "automatic") return;
    const client = supabase;
    if (!client) return;

    const result = await client.rpc("suggest_task_points", {
      p_student_id: studentId,
      p_category: nextCategory,
      p_difficulty: nextDifficulty
    });

    if (!result.error && result.data?.[0]) {
      setAchievementPoints(String(result.data[0].achievement_points || 0));
      setRewardPoints(String(result.data[0].reward_points || 0));
    }
  }

  useEffect(() => {
    loadData();
  }, [studentId]);

  useEffect(() => {
    if (goalFromUrl) setGoalId(goalFromUrl);
  }, [goalFromUrl]);

  useEffect(() => {
    loadSuggestedPoints();
  }, [category, difficulty, pointsMode]);

  const taskGroups = useMemo<TaskGroup[]>(() => {
    const groups = new Map<string, TaskGroup>();
    for (const task of tasks) {
      const key = task.goal_id || "general";
      if (!groups.has(key)) {
        groups.set(key, { key, goal: task.goal_id ? goals.find((goal) => goal.id === task.goal_id) || null : null, tasks: [] });
      }
      groups.get(key)?.tasks.push(task);
    }
    const result = Array.from(groups.values());
    return goalFromUrl ? result.filter((group) => group.key === goalFromUrl) : result;
  }, [tasks, goals, goalFromUrl]);

  const filterCounts = useMemo(() => {
    const counts: Record<TaskFilter, number> = { followup: 0, active: 0, upcoming: 0, completed: 0, all: tasks.length };
    for (const task of tasks) counts[taskBucket(task, today)] += 1;

    for (const group of taskGroups) {
      const reward = group.goal ? rewards[group.goal.id] : null;
      const allApproved = group.tasks.length > 0 && group.tasks.every((task) => task.status === "approved");
      if (group.goal && allApproved && reward?.status !== "paid") counts.followup += 1;
    }
    return counts;
  }, [tasks, taskGroups, rewards, today]);

  const visibleGroups = useMemo<VisibleTaskGroup[]>(() => {
    return taskGroups
      .map((group) => {
        const allTasks = group.tasks;
        const reward = group.goal ? rewards[group.goal.id] : null;
        const allApproved = allTasks.length > 0 && allTasks.every((task) => task.status === "approved");
        const rewardDue = Boolean(group.goal && allApproved && reward?.status !== "paid");
        const visibleTasks = filter === "all" ? allTasks : allTasks.filter((task) => taskBucket(task, today) === filter);
        const showReward = rewardDue && (filter === "followup" || filter === "completed" || filter === "all");
        return { ...group, allTasks, tasks: visibleTasks, showReward };
      })
      .filter((group) => group.tasks.length > 0 || group.showReward);
  }, [taskGroups, rewards, filter, today]);

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
    const result = await client.rpc("create_task_for_child_v2", {
      p_student_id: studentId,
      p_goal_id: goalId || null,
      p_title: title.trim(),
      p_description: description.trim(),
      p_category: category,
      p_difficulty: difficulty,
      p_achievement_points: Number(achievementPoints || 0),
      p_reward_points: Number(rewardPoints || 0),
      p_points_mode: pointsMode,
      p_due_date: dueDate || null,
      p_recurrence: recurrence
    });
    setSaving(false);

    if (result.error) {
      setError("تعذر إسناد المهمة. تحقق من البيانات وحاول مرة أخرى.");
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("behavior");
    setDifficulty("medium");
    setPointsMode("automatic");
    setDueDate("");
    setRecurrence("once");
    setShowCreateForm(false);
    setSuccess("تم إسناد المهمة وستظهر في حساب الطفل.");
    await loadSuggestedPoints("behavior", "medium");
    await loadData();
  }

  async function reviewTask(taskId: string, decision: "approved" | "rejected") {
    const client = supabase;
    if (!client) return;

    setBusyId(taskId);
    setError("");
    setSuccess("");
    const result = await client.rpc("review_child_task", {
      p_task_id: taskId,
      p_decision: decision,
      p_review_note: reviewNotes[taskId] || ""
    });
    setBusyId("");

    if (result.error) {
      setError("تعذر مراجعة المهمة الآن.");
      return;
    }

    setReviewNotes((current) => ({ ...current, [taskId]: "" }));
    setSuccess(decision === "approved" ? "تم اعتماد المرحلة وإضافة نقاطها." : "تمت إعادة المرحلة للطفل مع الملاحظة.");
    await loadData();
  }

  async function deleteTask(task: Task) {
    const warning = task.status === "submitted"
      ? `حذف المهمة «${task.title}»؟ الطفل أرسلها للمراجعة وسيُحذف إرساله معها.`
      : `حذف المهمة «${task.title}»؟ ستُحذف من خطة الطفل ويُعاد ترتيب المراحل تلقائيًا.`;

    if (!window.confirm(warning)) return;

    const client = supabase;
    if (!client) return;

    setDeletingId(task.id);
    setError("");
    setSuccess("");
    const result = await client.rpc("parent_delete_child_task", { p_task_id: task.id });
    setDeletingId("");

    if (result.error) {
      setError(result.error.message.includes("معتمدة") ? "لا يمكن حذف مهمة معتمدة لأنها أضافت نقاطًا للطفل." : "تعذر حذف المهمة الآن.");
      return;
    }

    const payload = result.data as { goal_completed?: boolean } | null;
    setSuccess(payload?.goal_completed ? "تم حذف المهمة، وأصبحت بقية مراحل الهدف مكتملة." : "تم حذف المهمة وإعادة ترتيب الخطة.");
    await loadData();
  }

  async function grantReward(goal: GoalOption) {
    const client = supabase;
    if (!client) return;

    setBusyGoalId(goal.id);
    setError("");
    setSuccess("");
    const result = await client.rpc("grant_goal_reward", {
      p_goal_id: goal.id,
      p_paid_amount: Number(rewardAmounts[goal.id] || 0),
      p_grant_note: rewardNotes[goal.id] || ""
    });
    setBusyGoalId("");

    if (result.error) {
      setError(friendlyRewardError(result.error.message));
      return;
    }

    setRewardNotes((current) => ({ ...current, [goal.id]: "" }));
    setSuccess("تم تسجيل منح المكافأة للطفل، وستظهر له في صفحة أهدافه.");
    await loadData();
  }

  if (loading) return <section className="goals-panel"><p>جارٍ تحميل المهام...</p></section>;

  return (
    <section className="tasks-workspace parent-plan-workspace simplified-task-followup">
      <div className="tasks-summary-card simplified-followup-summary">
        <div><span className="section-label">المتابعة المختصرة</span><h1>ما الذي يحتاج تدخلك الآن؟</h1><p>ابدأ من المهام المتأخرة أو التي أرسلها الطفل، واترك القادمة والمكتملة في تبويبات مستقلة.</p></div>
        <strong>{filterCounts.followup}<small>تحتاج متابعتك</small></strong>
      </div>

      <div className="parent-followup-toolbar">
        <div className="parent-followup-tabs" role="tablist" aria-label="فرز المهام">
          {filterLabels.map((item) => (
            <button className={filter === item.id ? "active" : ""} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} key={item.id}>
              <span>{item.icon}</span><strong>{item.label}</strong><b>{filterCounts[item.id]}</b>
            </button>
          ))}
        </div>
        <button className="toggle-task-create-button" type="button" onClick={() => setShowCreateForm((current) => !current)}>{showCreateForm ? "إغلاق الإضافة" : "+ مهمة إضافية"}</button>
      </div>

      {showCreateForm && (
        <section className="task-create-card simplified-create-card">
          <div className="task-create-head"><div><span className="section-label">إضافة اختيارية</span><h2>مهمة إضافية</h2></div><Link href="/settings/points">سياسات النقاط</Link></div>
          <form className="auth-form" onSubmit={createTask}>
            <label>الهدف المرتبط<select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">مهمة عامة بدون هدف</option>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>
            <label>عنوان المهمة<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: قراءة 20 دقيقة" required /></label>
            <label>الوصف<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="اشرح المطلوب للطفل" /></label>
            <div className="form-grid-two">
              <label>التصنيف<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="behavior">🌟 سلوكية</option><option value="educational">📚 تعليمية</option><option value="quran">📖 قرآن</option><option value="home">🏠 منزلية</option><option value="other">✨ أخرى</option></select></label>
              <label>درجة الصعوبة<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option><option value="major">إنجاز كبير</option></select></label>
            </div>
            <div className="points-mode-switch" role="group" aria-label="طريقة احتساب النقاط"><button className={pointsMode === "automatic" ? "active" : ""} type="button" onClick={() => setPointsMode("automatic")}>تلقائي</button><button className={pointsMode === "manual" ? "active" : ""} type="button" onClick={() => setPointsMode("manual")}>يدوي</button></div>
            <div className="dual-points-grid">
              <label className="achievement-point-field"><span>⭐ نقاط الإنجاز</span><input type="number" min="0" step="1" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} disabled={pointsMode === "automatic"} /></label>
              <label className="reward-point-field"><span>💎 نقاط المكافآت</span><input type="number" min="0" step="1" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} disabled={pointsMode === "automatic"} /></label>
            </div>
            <p className="points-suggestion-note">اقتراح نماء: {difficultyLabels[difficulty]} · {achievementPoints} ⭐ + {rewardPoints} 💎</p>
            <div className="form-grid-two"><label>تاريخ الاستحقاق<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>التكرار<select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}><option value="once">مرة واحدة</option><option value="daily">يومي</option><option value="weekly">أسبوعي</option></select></label></div>
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإسناد..." : "إسناد المهمة"}</button>
          </form>
        </section>
      )}

      <section className="task-list-card parent-plan-list-card simplified-followup-list">
        {error && <p className="form-message error-message">{error}</p>}
        {success && <p className="form-message success-message">{success}</p>}

        {visibleGroups.length === 0 ? (
          <div className="goals-empty-state followup-empty-state"><span>{filter === "followup" ? "🎉" : "📭"}</span><h3>{filter === "followup" ? "لا توجد مهام تحتاج تدخلك الآن" : "لا توجد مهام في هذا القسم"}</h3><p>{filter === "followup" ? "ستظهر هنا المهام المرسلة للمراجعة أو التي حان موعدها." : "اختر قسمًا آخر لعرض بقية المهام."}</p></div>
        ) : (
          <div className="parent-plan-groups">
            {visibleGroups.map((group) => {
              const approvedCount = group.allTasks.filter((task) => task.status === "approved").length;
              const allApproved = group.allTasks.length > 0 && approvedCount === group.allTasks.length;
              const reward = group.goal ? rewards[group.goal.id] : null;
              const rewardPaid = reward?.status === "paid";
              const planProgress = group.allTasks.length ? Math.round((approvedCount / group.allTasks.length) * 100) : 0;
              const goal = group.goal;

              return (
                <section className="parent-plan-group simplified-plan-group" key={group.key}>
                  <div className="parent-plan-group-head">
                    <div><span>{goal?.task_plan_mode ? planModeLabels[goal.task_plan_mode] || "خطة هدف" : goal ? "مهام الهدف" : "مهام عامة"}</span><h3>{goal?.title || "مهام مستقلة"}</h3><p>{approvedCount} من {group.allTasks.length} مراحل معتمدة</p></div>
                    <strong>{planProgress}%</strong>
                  </div>
                  <div className="parent-plan-progress"><span style={{ width: `${planProgress}%` }} /></div>

                  {goal && group.showReward && !rewardPaid && (
                    <div className="goal-reward-grant-card compact-reward-card">
                      <div className="reward-grant-title"><span>🏆</span><div><strong>المكافأة مستحقة الآن</strong><p>اكتملت جميع المهام، ولم يبقَ إلا تسجيل تسليم المكافأة.</p></div></div>
                      <div className="reward-grant-fields"><label>قيمة المكافأة<input type="number" min="0" step="0.01" value={rewardAmounts[goal.id] ?? String(goal.target_value || 0)} onChange={(event) => setRewardAmounts((current) => ({ ...current, [goal.id]: event.target.value }))} /></label><label>رسالة للطفل<input value={rewardNotes[goal.id] || ""} onChange={(event) => setRewardNotes((current) => ({ ...current, [goal.id]: event.target.value }))} placeholder="مثال: أحسنت الاستمرار" /></label></div>
                      <button type="button" disabled={busyGoalId === goal.id} onClick={() => grantReward(goal)}>{busyGoalId === goal.id ? "جارٍ التسجيل..." : "🎁 منح المكافأة"}</button>
                    </div>
                  )}

                  {goal && allApproved && rewardPaid && (filter === "completed" || filter === "all") && (
                    <div className="goal-reward-paid-card"><span>🎁</span><div><strong>تم منح المكافأة</strong><p>{reward?.grant_note || `${reward?.paid_amount || 0} ر.س`} {reward?.granted_at ? `· ${formatDate(reward.granted_at.slice(0, 10))}` : ""}</p></div></div>
                  )}

                  {group.tasks.length > 0 && (
                    <div className="parent-task-list">
                      {group.tasks.map((task) => {
                        const bucket = taskBucket(task, today);
                        return (
                          <article className={`parent-task-card task-${task.status} followup-card-${bucket}`} key={task.id}>
                            <div className="parent-task-head">
                              <div>
                                <div className="parent-task-stage-row"><span className={`task-status task-status-${task.status}`}>{statusLabels[task.status] || task.status}</span>{task.plan_step && <b>المرحلة {task.plan_step} من {task.plan_total}</b>}</div>
                                <h3>{task.title}</h3>
                                <p>{categoryLabels[task.category] || task.category} · {task.achievement_points} ⭐ + {task.reward_points} 💎</p>
                              </div>
                              {task.due_date && <time>{formatDate(task.due_date)}</time>}
                            </div>

                            {bucket === "followup" && <div className="task-followup-reason"><span>🔔</span><strong>{followupReason(task, today)}</strong></div>}
                            {(task.starts_on || task.due_date) && <div className="parent-task-period"><span>📅</span><strong>{task.starts_on === task.due_date ? formatDate(task.due_date) : `${formatDate(task.starts_on)} — ${formatDate(task.due_date)}`}</strong></div>}
                            {task.description && <p className="task-description">{task.description}</p>}
                            {task.child_note && <div className="task-note"><strong>ملاحظة الطفل</strong><p>{task.child_note}</p></div>}
                            {task.review_note && <div className="task-note review"><strong>ملاحظتك السابقة</strong><p>{task.review_note}</p></div>}

                            {task.status === "submitted" && <div className="task-review-box"><textarea rows={2} value={reviewNotes[task.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="ملاحظة اختيارية للطفل" /><div><button disabled={busyId === task.id} onClick={() => reviewTask(task.id, "approved")}>اعتماد الإنجاز</button><button className="task-reject-button" disabled={busyId === task.id} onClick={() => reviewTask(task.id, "rejected")}>إعادة للطفل</button></div></div>}

                            {task.status !== "approved" && (
                              <div className="task-card-footer-actions"><button className="task-delete-button" type="button" disabled={deletingId === task.id || busyId === task.id} onClick={() => deleteTask(task)}>{deletingId === task.id ? "جارٍ الحذف..." : "حذف المهمة"}</button></div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
