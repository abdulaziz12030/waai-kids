"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  decision_note: string | null;
  decided_at: string | null;
  converted_to_tasks_at: string | null;
  task_plan_mode: string | null;
  task_plan_count: number | null;
};

type TaskSummary = {
  total: number;
  pending: number;
  submitted: number;
  approved: number;
};

type ReviewDraft = {
  goalId: string;
  decision: "approved" | "rejected";
  startDate: string;
  dueDate: string;
  note: string;
};

type PlanDraft = {
  goalId: string;
  startDate: string;
  dueDate: string;
  splitMode: "single" | "daily" | "weekly" | "milestones";
  installments: string;
  titlePrefix: string;
  category: string;
  difficulty: string;
  pointsMode: "automatic" | "manual";
  achievementPoints: string;
  rewardPoints: string;
  note: string;
  partDescriptions: string[];
};

type PlanPeriod = {
  label: string;
  startDate: string;
  dueDate: string;
};

const typeLabels: Record<string, string> = {
  financial: "مالي",
  material: "عيني",
  educational: "تعليمي",
  behavioral: "سلوكي"
};

const statusLabels: Record<string, string> = {
  requested: "بانتظار الموافقة",
  pending: "بانتظار الموافقة",
  approved: "معتمد",
  active: "نشط",
  rejected: "مرفوض",
  completed: "مكتمل",
  paused: "متوقف"
};

const planModeLabels: Record<string, string> = {
  single: "مهمة واحدة",
  daily: "مهام يومية",
  weekly: "مهام أسبوعية",
  milestones: "مراحل مخصصة"
};

const emptyTaskSummary: TaskSummary = { total: 0, pending: 0, submitted: 0, approved: 0 };

function toIsoDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function todayIso() {
  return toIsoDate(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return toIsoDate(value);
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function estimateTaskCount(draft: PlanDraft | null) {
  if (!draft?.startDate || !draft.dueDate) return 0;
  const start = new Date(`${draft.startDate}T12:00:00`).getTime();
  const due = new Date(`${draft.dueDate}T12:00:00`).getTime();
  const days = Math.floor((due - start) / 86_400_000) + 1;
  if (days <= 0) return 0;
  if (draft.splitMode === "single") return 1;
  if (draft.splitMode === "daily") return days;
  if (draft.splitMode === "weekly") return Math.ceil(days / 7);
  return Math.max(0, Number(draft.installments || 0));
}

function buildPlanPeriods(draft: PlanDraft | null): PlanPeriod[] {
  const count = estimateTaskCount(draft);
  if (!draft || count < 1) return [];

  const start = new Date(`${draft.startDate}T12:00:00`);
  const due = new Date(`${draft.dueDate}T12:00:00`);
  const totalDays = Math.floor((due.getTime() - start.getTime()) / 86_400_000) + 1;

  return Array.from({ length: count }, (_, index) => {
    let periodStart = new Date(start);
    let periodDue = new Date(due);

    if (draft.splitMode === "daily") {
      periodStart.setDate(start.getDate() + index);
      periodDue = new Date(periodStart);
    } else if (draft.splitMode === "weekly") {
      periodStart.setDate(start.getDate() + index * 7);
      periodDue = new Date(periodStart);
      periodDue.setDate(periodDue.getDate() + 6);
      if (periodDue > due) periodDue = new Date(due);
    } else if (draft.splitMode === "milestones") {
      const startOffset = Math.floor((index * totalDays) / count);
      const nextOffset = Math.floor(((index + 1) * totalDays) / count);
      periodStart.setDate(start.getDate() + startOffset);
      periodDue = index === count - 1 ? new Date(due) : new Date(start);
      if (index !== count - 1) periodDue.setDate(start.getDate() + Math.max(startOffset, nextOffset - 1));
    }

    const label = draft.splitMode === "weekly"
      ? `الأسبوع ${index + 1} من ${count}`
      : draft.splitMode === "daily"
        ? `اليوم ${index + 1} من ${count}`
        : draft.splitMode === "milestones"
          ? `المرحلة ${index + 1} من ${count}`
          : "المهمة المطلوبة";

    return {
      label,
      startDate: toIsoDate(periodStart),
      dueDate: toIsoDate(periodDue)
    };
  });
}

function friendlyError(message?: string) {
  if (!message) return "تعذر تنفيذ العملية الآن.";
  if (message.includes("يوجد مهام مرتبطة")) return "يوجد بالفعل مهام مرتبطة بهذا الهدف. يمكنك إدارتها من صفحة المهام.";
  if (message.includes("تاريخ الاستحقاق")) return "تحقق من تاريخ البداية وتاريخ الاستحقاق.";
  if (message.includes("التجزئة اليومية")) return "التجزئة اليومية متاحة للخطط التي لا تتجاوز 90 يومًا.";
  if (message.includes("عدد المراحل")) return message;
  if (message.includes("غير مصرح")) return "لا تملك صلاحية تعديل هذا الهدف.";
  return message;
}

export default function ChildGoals({ studentId }: { studentId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [taskSummaries, setTaskSummaries] = useState<Record<string, TaskSummary>>({});
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadGoals() {
    const client = supabase;
    if (!client) return;

    setLoading(true);
    const [goalResult, taskResult] = await Promise.all([
      client
        .from("goals")
        .select("id, title, description, goal_type, status, target_value, child_contribution, required_points, start_date, due_date, progress, decision_note, decided_at, converted_to_tasks_at, task_plan_mode, task_plan_count")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      client
        .from("tasks")
        .select("goal_id, status")
        .eq("student_id", studentId)
        .not("goal_id", "is", null)
    ]);

    if (goalResult.error) {
      setError(friendlyError(goalResult.error.message));
    } else {
      setGoals((goalResult.data || []) as Goal[]);
    }

    if (!taskResult.error) {
      const summaries: Record<string, TaskSummary> = {};
      for (const task of taskResult.data || []) {
        if (!task.goal_id) continue;
        const current = summaries[task.goal_id] || { ...emptyTaskSummary };
        current.total += 1;
        if (task.status === "pending" || task.status === "rejected") current.pending += 1;
        if (task.status === "submitted") current.submitted += 1;
        if (task.status === "approved") current.approved += 1;
        summaries[task.goal_id] = current;
      }
      setTaskSummaries(summaries);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGoals();
  }, [studentId]);

  useEffect(() => {
    async function loadSuggestedPoints() {
      if (!planDraft || planDraft.pointsMode !== "automatic") return;
      const client = supabase;
      if (!client) return;

      const result = await client.rpc("suggest_task_points", {
        p_student_id: studentId,
        p_category: planDraft.category,
        p_difficulty: planDraft.difficulty
      });

      if (!result.error && result.data?.[0]) {
        setPlanDraft((current) => current && current.goalId === planDraft.goalId ? {
          ...current,
          achievementPoints: String(result.data[0].achievement_points || 0),
          rewardPoints: String(result.data[0].reward_points || 0)
        } : current);
      }
    }

    loadSuggestedPoints();
  }, [planDraft?.goalId, planDraft?.category, planDraft?.difficulty, planDraft?.pointsMode, studentId]);

  const pendingCount = useMemo(
    () => goals.filter((goal) => goal.status === "pending" || goal.status === "requested").length,
    [goals]
  );

  function updatePlanDraft(patch: Partial<PlanDraft>) {
    setPlanDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      const count = estimateTaskCount(next);
      return {
        ...next,
        partDescriptions: Array.from({ length: count }, (_, index) => next.partDescriptions[index] || "")
      };
    });
  }

  function updatePartDescription(index: number, value: string) {
    setPlanDraft((current) => {
      if (!current) return current;
      const nextDescriptions = [...current.partDescriptions];
      nextDescriptions[index] = value;
      return { ...current, partDescriptions: nextDescriptions };
    });
  }

  function openReview(goal: Goal, decision: "approved" | "rejected") {
    setPlanDraft(null);
    setError("");
    setSuccess("");
    const startDate = goal.start_date || todayIso();
    setReviewDraft({
      goalId: goal.id,
      decision,
      startDate,
      dueDate: goal.due_date || addDays(startDate, 30),
      note: goal.decision_note || ""
    });
  }

  function openPlanner(goal: Goal) {
    setReviewDraft(null);
    setError("");
    setSuccess("");
    const startDate = goal.start_date || todayIso();
    const draft: PlanDraft = {
      goalId: goal.id,
      startDate,
      dueDate: goal.due_date || addDays(startDate, 30),
      splitMode: "weekly",
      installments: "4",
      titlePrefix: goal.title || "",
      category: goal.goal_type === "educational" ? "educational" : goal.goal_type === "behavioral" ? "behavior" : "other",
      difficulty: "medium",
      pointsMode: "automatic",
      achievementPoints: "10",
      rewardPoints: "1",
      note: goal.decision_note || "",
      partDescriptions: []
    };
    draft.partDescriptions = Array.from({ length: estimateTaskCount(draft) }, () => "");
    setPlanDraft(draft);
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !reviewDraft) return;

    if (reviewDraft.decision === "approved" && (!reviewDraft.startDate || !reviewDraft.dueDate)) {
      setError("حدد بداية الهدف وتاريخ استحقاقه قبل الموافقة.");
      return;
    }

    setBusyId(reviewDraft.goalId);
    setError("");
    setSuccess("");
    const result = await client.rpc("review_child_goal", {
      p_goal_id: reviewDraft.goalId,
      p_decision: reviewDraft.decision,
      p_review_note: reviewDraft.note.trim() || null,
      p_start_date: reviewDraft.decision === "approved" ? reviewDraft.startDate : null,
      p_due_date: reviewDraft.decision === "approved" ? reviewDraft.dueDate : null
    });
    setBusyId("");

    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }

    setSuccess(reviewDraft.decision === "approved" ? "تمت الموافقة على الهدف وتحديد مدته." : "تم رفض الهدف وإبلاغ الطفل بالقرار.");
    setReviewDraft(null);
    await loadGoals();
  }

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !planDraft) return;

    const taskCount = estimateTaskCount(planDraft);
    if (!planDraft.startDate || !planDraft.dueDate || taskCount < 1) {
      setError("تحقق من المدة وطريقة التجزئة قبل إنشاء الخطة.");
      return;
    }

    setBusyId(planDraft.goalId);
    setError("");
    setSuccess("");
    const result = await client.rpc("convert_goal_to_task_plan_v2", {
      p_goal_id: planDraft.goalId,
      p_start_date: planDraft.startDate,
      p_due_date: planDraft.dueDate,
      p_split_mode: planDraft.splitMode,
      p_installments: Number(planDraft.installments || 0),
      p_title_prefix: planDraft.titlePrefix.trim() || null,
      p_category: planDraft.category,
      p_difficulty: planDraft.difficulty,
      p_points_mode: planDraft.pointsMode,
      p_achievement_points: Number(planDraft.achievementPoints || 0),
      p_reward_points: Number(planDraft.rewardPoints || 0),
      p_review_note: planDraft.note.trim() || null,
      p_step_descriptions: planDraft.partDescriptions.map((description) => description.trim())
    });
    setBusyId("");

    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }

    const createdCount = Number(result.data?.task_count || taskCount);
    const describedCount = Number(result.data?.custom_descriptions_count || 0);
    setSuccess(`تم اعتماد الهدف وإنشاء ${createdCount} ${createdCount === 1 ? "مهمة" : "مهام"}${describedCount ? ` مع ${describedCount} أوصاف مستقلة` : ""}.`);
    setPlanDraft(null);
    await loadGoals();
  }

  async function updateGoal(id: string, patch: Record<string, unknown>, successMessage: string) {
    const client = supabase;
    if (!client) return;

    setBusyId(id);
    setError("");
    setSuccess("");
    const result = await client
      .from("goals")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId("");

    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }

    setSuccess(successMessage);
    await loadGoals();
  }

  async function deleteGoal(id: string) {
    const client = supabase;
    if (!client) return;

    setBusyId(id);
    setError("");
    setSuccess("");
    const result = await client.from("goals").delete().eq("id", id);
    setBusyId("");

    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }

    setSuccess("تم حذف الهدف.");
    await loadGoals();
  }

  if (loading) return <section className="goals-panel"><p>جارٍ تحميل الأهداف...</p></section>;

  return (
    <section className="goals-panel goal-review-workspace">
      <div className="goals-panel-head">
        <div>
          <span className="section-label">إشراف ولي الأمر</span>
          <h2>الأهداف والقرارات</h2>
          <p>راجع طلب الطفل، وافق عليه أو ارفضه، أو حوّله مباشرة إلى خطة مهام موزعة زمنيًا.</p>
        </div>
        <div className="goal-head-actions">
          {pendingCount > 0 && <span className="pending-goals-badge">{pendingCount} تنتظر قرارك</span>}
          <Link className="auth-submit link-submit goals-add-button" href={`/children/${studentId}/goals/new`}>إضافة هدف</Link>
        </div>
      </div>

      {error && <p className="form-message error-message goal-workspace-message">{error}</p>}
      {success && <p className="form-message success-message goal-workspace-message">{success}</p>}

      {goals.length === 0 ? (
        <div className="goals-empty-state"><span>🎯</span><h3>لا توجد أهداف بعد</h3><p>يمكن للطفل طلب هدف، أو يمكنك إنشاء هدف له من هنا.</p></div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const progress = Math.min(100, Math.max(0, Number(goal.progress || 0)));
            const taskSummary = taskSummaries[goal.id] || emptyTaskSummary;
            const hasTasks = taskSummary.total > 0 || Number(goal.task_plan_count || 0) > 0;
            const canReview = goal.status === "pending" || goal.status === "requested";
            const canPlan = ["pending", "requested", "approved", "paused"].includes(goal.status) && !hasTasks;
            const planIsOpen = planDraft?.goalId === goal.id;
            const reviewIsOpen = reviewDraft?.goalId === goal.id;
            const planPeriods = planIsOpen ? buildPlanPeriods(planDraft) : [];

            return (
              <article className={`goal-card goal-decision-card goal-card-${goal.status}`} key={goal.id}>
                <div className="goal-card-head">
                  <div>
                    <span className={`goal-status goal-status-${goal.status}`}>{statusLabels[goal.status] || goal.status}</span>
                    <h3>{goal.title || "هدف بدون عنوان"}</h3>
                    <p>{typeLabels[goal.goal_type] || goal.goal_type}</p>
                  </div>
                  <div className="goal-date-stack">
                    <small>الاستحقاق</small>
                    <time>{formatDate(goal.due_date)}</time>
                  </div>
                </div>

                {goal.description && <p className="goal-description">{goal.description}</p>}

                <div className="goal-facts goal-facts-expanded">
                  <span><small>القيمة</small><strong>{goal.target_value ? `${goal.target_value} ر.س` : "غير محددة"}</strong></span>
                  <span><small>النقاط المطلوبة</small><strong>{goal.required_points || 0} 💎</strong></span>
                  <span><small>مدة الهدف</small><strong>{goal.start_date ? `${formatDate(goal.start_date)} — ${formatDate(goal.due_date)}` : "بانتظار القرار"}</strong></span>
                  <span><small>خطة التنفيذ</small><strong>{goal.task_plan_mode ? `${planModeLabels[goal.task_plan_mode] || goal.task_plan_mode} · ${goal.task_plan_count || taskSummary.total}` : hasTasks ? `${taskSummary.total} مهام` : "لم تُنشأ بعد"}</strong></span>
                </div>

                {goal.decision_note && (
                  <div className={`goal-decision-note ${goal.status === "rejected" ? "rejected" : ""}`}>
                    <strong>{goal.status === "rejected" ? "سبب الرفض" : "ملاحظة ولي الأمر"}</strong>
                    <p>{goal.decision_note}</p>
                  </div>
                )}

                {hasTasks && (
                  <div className="goal-task-summary">
                    <div><span>المهام</span><strong>{taskSummary.total || goal.task_plan_count || 0}</strong></div>
                    <div><span>قيد التنفيذ</span><strong>{taskSummary.pending}</strong></div>
                    <div><span>تنتظر المراجعة</span><strong>{taskSummary.submitted}</strong></div>
                    <div><span>مكتملة</span><strong>{taskSummary.approved}</strong></div>
                  </div>
                )}

                <div className="progress-row">
                  <div className="progress-row-head"><span>نسبة الإنجاز</span><strong>{progress}%</strong></div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>

                <div className="goal-actions goal-decision-actions">
                  {canReview && (
                    <>
                      <button type="button" disabled={busyId === goal.id} onClick={() => openReview(goal, "approved")}>✓ موافقة</button>
                      <button className="danger-goal-action" type="button" disabled={busyId === goal.id} onClick={() => openReview(goal, "rejected")}>رفض</button>
                    </>
                  )}

                  {canPlan && (
                    <button className="goal-plan-action" type="button" disabled={busyId === goal.id} onClick={() => openPlanner(goal)}>🗓 تحويل إلى خطة مهام</button>
                  )}

                  {hasTasks && (
                    <Link className="goal-task-link" href={`/children/${studentId}/tasks?goal=${goal.id}`}>إدارة المهام المرتبطة</Link>
                  )}

                  {goal.status === "approved" && (
                    <button className="secondary-goal-action" type="button" disabled={busyId === goal.id} onClick={() => updateGoal(goal.id, { status: "paused" }, "تم إيقاف الهدف مؤقتًا.")}>إيقاف مؤقت</button>
                  )}

                  {goal.status === "paused" && (
                    <button className="secondary-goal-action" type="button" disabled={busyId === goal.id} onClick={() => updateGoal(goal.id, { status: "approved" }, "تم استئناف الهدف.")}>استئناف</button>
                  )}

                  {(goal.status === "pending" || goal.status === "requested" || goal.status === "rejected") && !hasTasks && (
                    <button className="danger-goal-action subtle-delete-action" type="button" disabled={busyId === goal.id} onClick={() => deleteGoal(goal.id)}>حذف</button>
                  )}
                </div>

                {reviewIsOpen && reviewDraft && (
                  <form className={`goal-inline-panel goal-review-panel ${reviewDraft.decision}`} onSubmit={submitReview}>
                    <div className="goal-inline-panel-head">
                      <div><span>{reviewDraft.decision === "approved" ? "اعتماد الهدف" : "رفض الهدف"}</span><h4>{reviewDraft.decision === "approved" ? "حدد المدة قبل الموافقة" : "أضف سببًا واضحًا للطفل"}</h4></div>
                      <button type="button" onClick={() => setReviewDraft(null)}>×</button>
                    </div>

                    {reviewDraft.decision === "approved" && (
                      <div className="goal-plan-grid two-columns">
                        <label>تاريخ البداية<input type="date" value={reviewDraft.startDate} onChange={(event) => setReviewDraft({ ...reviewDraft, startDate: event.target.value })} required /></label>
                        <label>تاريخ الاستحقاق<input type="date" min={reviewDraft.startDate} value={reviewDraft.dueDate} onChange={(event) => setReviewDraft({ ...reviewDraft, dueDate: event.target.value })} required /></label>
                      </div>
                    )}

                    <label>{reviewDraft.decision === "approved" ? "ملاحظة للطفل (اختياري)" : "سبب الرفض"}<textarea rows={3} value={reviewDraft.note} onChange={(event) => setReviewDraft({ ...reviewDraft, note: event.target.value })} placeholder={reviewDraft.decision === "approved" ? "مثال: ابدأ بخطوات بسيطة وراجع تقدمك كل أسبوع" : "اشرح سبب الرفض أو ما يحتاجه الهدف ليُقبل لاحقًا"} /></label>

                    <div className="goal-inline-submit-row">
                      <button className={reviewDraft.decision === "rejected" ? "danger-submit" : ""} type="submit" disabled={busyId === goal.id}>{busyId === goal.id ? "جارٍ الحفظ..." : reviewDraft.decision === "approved" ? "تأكيد الموافقة" : "تأكيد الرفض"}</button>
                      <button className="cancel-inline-action" type="button" onClick={() => setReviewDraft(null)}>إلغاء</button>
                    </div>
                  </form>
                )}

                {planIsOpen && planDraft && (
                  <form className="goal-inline-panel goal-plan-panel" onSubmit={submitPlan}>
                    <div className="goal-inline-panel-head">
                      <div><span>خطة التنفيذ</span><h4>قسّم الهدف واكتب المطلوب في كل جزء</h4></div>
                      <button type="button" onClick={() => setPlanDraft(null)}>×</button>
                    </div>

                    <div className="goal-plan-grid two-columns">
                      <label>تاريخ البداية<input type="date" value={planDraft.startDate} onChange={(event) => updatePlanDraft({ startDate: event.target.value })} required /></label>
                      <label>تاريخ الاستحقاق<input type="date" min={planDraft.startDate} value={planDraft.dueDate} onChange={(event) => updatePlanDraft({ dueDate: event.target.value })} required /></label>
                    </div>

                    <fieldset className="goal-split-options">
                      <legend>طريقة التجزئة</legend>
                      {([
                        ["single", "مهمة واحدة", "من البداية حتى الاستحقاق"],
                        ["daily", "يومي", "مهمة لكل يوم"],
                        ["weekly", "أسبوعي", "مهمة لكل أسبوع"],
                        ["milestones", "مراحل", "عدد تحدده أنت"]
                      ] as const).map(([value, title, description]) => (
                        <label className={planDraft.splitMode === value ? "active" : ""} key={value}>
                          <input type="radio" name={`split-${goal.id}`} value={value} checked={planDraft.splitMode === value} onChange={() => updatePlanDraft({ splitMode: value })} />
                          <strong>{title}</strong><small>{description}</small>
                        </label>
                      ))}
                    </fieldset>

                    {planDraft.splitMode === "milestones" && (
                      <label className="goal-installments-field">عدد المراحل<input type="number" min="2" max="30" step="1" value={planDraft.installments} onChange={(event) => updatePlanDraft({ installments: event.target.value })} required /></label>
                    )}

                    <div className="goal-plan-estimate">
                      <span>سيتم إنشاء</span>
                      <strong>{estimateTaskCount(planDraft)} {estimateTaskCount(planDraft) === 1 ? "مهمة" : "مهام"}</strong>
                      <small>توزع تلقائيًا بين {formatDate(planDraft.startDate)} و{formatDate(planDraft.dueDate)}</small>
                    </div>

                    <section className="goal-part-descriptions">
                      <div className="goal-part-descriptions-head">
                        <div><span>وصف كل جزء</span><strong>حدد المطلوب من الطفل في كل فترة</strong></div>
                        <small>يمكن ترك أي جزء فارغًا ليستخدم الوصف العام تلقائيًا.</small>
                      </div>
                      <div className="goal-part-description-list">
                        {planPeriods.map((period, index) => (
                          <label className="goal-part-description-card" key={`${period.label}-${index}`}>
                            <span className="goal-part-description-number">{index + 1}</span>
                            <div className="goal-part-description-title">
                              <strong>{period.label}</strong>
                              <small>{period.startDate === period.dueDate ? formatDate(period.startDate) : `${formatDate(period.startDate)} — ${formatDate(period.dueDate)}`}</small>
                            </div>
                            <textarea
                              rows={2}
                              value={planDraft.partDescriptions[index] || ""}
                              onChange={(event) => updatePartDescription(index, event.target.value)}
                              placeholder={planDraft.splitMode === "weekly" ? "مثال: حفظ الآيات 1–6 مع مراجعتها" : "اكتب المهمة المطلوبة في هذا الجزء"}
                            />
                          </label>
                        ))}
                      </div>
                    </section>

                    <label>عنوان المهام<input value={planDraft.titlePrefix} onChange={(event) => updatePlanDraft({ titlePrefix: event.target.value })} placeholder="يُستخدم عنوان الهدف تلقائيًا" /></label>

                    <div className="goal-plan-grid two-columns">
                      <label>نوع المهمة<select value={planDraft.category} onChange={(event) => updatePlanDraft({ category: event.target.value })}><option value="behavior">سلوكية</option><option value="educational">تعليمية</option><option value="quran">قرآن</option><option value="home">منزلية</option><option value="other">أخرى</option></select></label>
                      <label>درجة الصعوبة<select value={planDraft.difficulty} onChange={(event) => updatePlanDraft({ difficulty: event.target.value })}><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option><option value="major">إنجاز كبير</option></select></label>
                    </div>

                    <div className="goal-plan-points-head">
                      <div><strong>نقاط كل مهمة</strong><small>تضاف بعد اعتماد إنجاز الطفل</small></div>
                      <div className="points-mode-switch compact-switch">
                        <button className={planDraft.pointsMode === "automatic" ? "active" : ""} type="button" onClick={() => updatePlanDraft({ pointsMode: "automatic" })}>تلقائي</button>
                        <button className={planDraft.pointsMode === "manual" ? "active" : ""} type="button" onClick={() => updatePlanDraft({ pointsMode: "manual" })}>يدوي</button>
                      </div>
                    </div>

                    <div className="goal-plan-grid two-columns">
                      <label>⭐ نقاط الإنجاز<input type="number" min="0" step="1" value={planDraft.achievementPoints} onChange={(event) => updatePlanDraft({ achievementPoints: event.target.value })} disabled={planDraft.pointsMode === "automatic"} /></label>
                      <label>💎 نقاط المكافآت<input type="number" min="0" step="1" value={planDraft.rewardPoints} onChange={(event) => updatePlanDraft({ rewardPoints: event.target.value })} disabled={planDraft.pointsMode === "automatic"} /></label>
                    </div>

                    <label>وصف عام احتياطي<textarea rows={3} value={planDraft.note} onChange={(event) => updatePlanDraft({ note: event.target.value })} placeholder="يظهر للأجزاء التي لم تكتب لها وصفًا مستقلًا" /></label>

                    <div className="goal-inline-submit-row">
                      <button type="submit" disabled={busyId === goal.id}>{busyId === goal.id ? "جارٍ إنشاء الخطة..." : `اعتماد وإنشاء ${estimateTaskCount(planDraft)} مهام`}</button>
                      <button className="cancel-inline-action" type="button" onClick={() => setPlanDraft(null)}>إلغاء</button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
