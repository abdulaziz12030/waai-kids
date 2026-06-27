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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [busyGoalId, setBusyGoalId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const submittedCount = useMemo(
    () => tasks.filter((task) => task.status === "submitted").length,
    [tasks]
  );

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
    setSuccess(decision === "approved" ? "تم اعتماد المرحلة وإضافة نقاطها. ستفتح المرحلة التالية للطفل حسب موعدها." : "تمت إعادة المرحلة للطفل مع الملاحظة.");
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
    <section className="tasks-workspace parent-plan-workspace">
      <div className="tasks-summary-card">
        <div><span className="section-label">المتابعة والاعتماد</span><h1>خطة مهام الطفل</h1><p>راجع إنجاز كل مرحلة، واعتمدها لفتح المرحلة التالية. بعد اكتمال جميع المراحل امنح الطفل مكافأة الهدف.</p></div>
        <strong>{submittedCount}<small>تنتظر اعتمادك</small></strong>
      </div>

      <div className="tasks-layout">
        <section className="task-create-card">
          <div className="task-create-head"><h2>مهمة إضافية</h2><Link href="/settings/points">سياسات النقاط</Link></div>
          <form className="auth-form" onSubmit={createTask}>
            <label>الهدف المرتبط<select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">مهمة عامة بدون هدف</option>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>
            <label>عنوان المهمة<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: قراءة 20 دقيقة" required /></label>
            <label>الوصف<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="اشرح المطلوب للطفل" /></label>
            <div className="form-grid-two">
              <label>التصنيف<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="behavior">🌟 سلوكية</option><option value="educational">📚 تعليمية</option><option value="quran">📖 قرآن</option><option value="home">🏠 منزلية</option><option value="other">✨ أخرى</option></select></label>
              <label>درجة الصعوبة<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">سهل · 5 نقاط افتراضيًا</option><option value="medium">متوسط · 10 نقاط افتراضيًا</option><option value="hard">صعب · 20 نقطة افتراضيًا</option><option value="major">إنجاز كبير · 50 نقطة افتراضيًا</option></select></label>
            </div>
            <div className="points-mode-switch" role="group" aria-label="طريقة احتساب النقاط"><button className={pointsMode === "automatic" ? "active" : ""} type="button" onClick={() => setPointsMode("automatic")}>تلقائي</button><button className={pointsMode === "manual" ? "active" : ""} type="button" onClick={() => setPointsMode("manual")}>يدوي</button></div>
            <div className="dual-points-grid">
              <label className="achievement-point-field"><span>⭐ نقاط الإنجاز</span><input type="number" min="0" step="1" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} disabled={pointsMode === "automatic"} /><small>للمستوى والرتبة</small></label>
              <label className="reward-point-field"><span>💎 نقاط المكافآت</span><input type="number" min="0" step="1" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} disabled={pointsMode === "automatic"} /><small>للأهداف والجوائز</small></label>
            </div>
            <p className="points-suggestion-note">اقتراح نماء: {difficultyLabels[difficulty]} · {achievementPoints} ⭐ + {rewardPoints} 💎</p>
            <div className="form-grid-two"><label>تاريخ الاستحقاق<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>التكرار<select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}><option value="once">مرة واحدة</option><option value="daily">يومي</option><option value="weekly">أسبوعي</option></select></label></div>
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإسناد..." : "إسناد المهمة"}</button>
          </form>
        </section>

        <section className="task-list-card parent-plan-list-card">
          <div className="task-list-head"><div><span className="section-label">المراحل</span><h2>{goalFromUrl ? "مهام الهدف المحدد" : "جميع خطط الطفل"}</h2></div></div>
          {error && <p className="form-message error-message">{error}</p>}
          {success && <p className="form-message success-message">{success}</p>}
          {taskGroups.length === 0 ? <div className="goals-empty-state"><span>✅</span><h3>لا توجد مهام بعد</h3><p>حوّل هدف الطفل إلى خطة أو أنشئ مهمة إضافية.</p></div> : (
            <div className="parent-plan-groups">
              {taskGroups.map((group) => {
                const approvedCount = group.tasks.filter((task) => task.status === "approved").length;
                const allApproved = group.tasks.length > 0 && approvedCount === group.tasks.length;
                const reward = group.goal ? rewards[group.goal.id] : null;
                const rewardPaid = reward?.status === "paid";
                const planProgress = group.tasks.length ? Math.round((approvedCount / group.tasks.length) * 100) : 0;
                return (
                  <section className="parent-plan-group" key={group.key}>
                    <div className="parent-plan-group-head">
                      <div><span>{group.goal?.task_plan_mode ? planModeLabels[group.goal.task_plan_mode] || "خطة هدف" : group.goal ? "مهام الهدف" : "مهام عامة"}</span><h3>{group.goal?.title || "مهام مستقلة"}</h3><p>{approvedCount} من {group.tasks.length} مراحل معتمدة</p></div>
                      <strong>{planProgress}%</strong>
                    </div>
                    <div className="parent-plan-progress"><span style={{ width: `${planProgress}%` }} /></div>

                    {group.goal && allApproved && !rewardPaid && (
                      <div className="goal-reward-grant-card">
                        <div className="reward-grant-title"><span>🏆</span><div><strong>اكتملت الخطة وأصبحت المكافأة مستحقة</strong><p>سجّل تسليم المكافأة ليظهر للطفل أنه حصل عليها.</p></div></div>
                        <div className="reward-grant-fields"><label>قيمة المكافأة<input type="number" min="0" step="0.01" value={rewardAmounts[group.goal.id] ?? String(group.goal.target_value || 0)} onChange={(event) => setRewardAmounts((current) => ({ ...current, [group.goal!.id]: event.target.value }))} /></label><label>رسالة للطفل<input value={rewardNotes[group.goal.id] || ""} onChange={(event) => setRewardNotes((current) => ({ ...current, [group.goal!.id]: event.target.value }))} placeholder="مثال: تستحقها، أحسنت الاستمرار" /></label></div>
                        <button type="button" disabled={busyGoalId === group.goal.id} onClick={() => grantReward(group.goal!)}>{busyGoalId === group.goal.id ? "جارٍ التسجيل..." : "🎁 منح المكافأة للطفل"}</button>
                      </div>
                    )}

                    {group.goal && rewardPaid && (
                      <div className="goal-reward-paid-card"><span>🎁</span><div><strong>تم منح المكافأة</strong><p>{reward?.grant_note || `${reward?.paid_amount || 0} ر.س`} {reward?.granted_at ? `· ${formatDate(reward.granted_at.slice(0, 10))}` : ""}</p></div></div>
                    )}

                    <div className="parent-task-list">
                      {group.tasks.map((task) => (
                        <article className={`parent-task-card task-${task.status}`} key={task.id}>
                          <div className="parent-task-head"><div><div className="parent-task-stage-row"><span className={`task-status task-status-${task.status}`}>{statusLabels[task.status] || task.status}</span>{task.plan_step && <b>المرحلة {task.plan_step} من {task.plan_total}</b>}</div><h3>{task.title}</h3><p>{categoryLabels[task.category] || task.category} · {task.achievement_points} ⭐ + {task.reward_points} 💎</p></div>{task.due_date && <time>{formatDate(task.due_date)}</time>}</div>
                          {(task.starts_on || task.due_date) && <div className="parent-task-period"><span>📅</span><strong>{task.starts_on === task.due_date ? formatDate(task.due_date) : `${formatDate(task.starts_on)} — ${formatDate(task.due_date)}`}</strong></div>}
                          {task.description && <p className="task-description">{task.description}</p>}
                          {task.child_note && <div className="task-note"><strong>ملاحظة الطفل</strong><p>{task.child_note}</p></div>}
                          {task.review_note && <div className="task-note review"><strong>ملاحظة ولي الأمر</strong><p>{task.review_note}</p></div>}
                          {task.status === "submitted" && <div className="task-review-box"><textarea rows={2} value={reviewNotes[task.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="ملاحظة اختيارية للطفل" /><div><button disabled={busyId === task.id} onClick={() => reviewTask(task.id, "approved")}>اعتماد المرحلة وفتح التالية</button><button className="task-reject-button" disabled={busyId === task.id} onClick={() => reviewTask(task.id, "rejected")}>إعادة للطفل</button></div></div>}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
