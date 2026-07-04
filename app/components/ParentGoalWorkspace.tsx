"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./ParentGoalWorkspace.module.css";

type Goal = {
  id: string;
  title: string | null;
  description: string | null;
  goal_type: string;
  status: string;
  target_value: number | null;
  required_points: number | null;
  start_date: string | null;
  due_date: string | null;
  progress: number | null;
  decision_note: string | null;
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

type TaskCategory = "quran" | "educational" | "behavior" | "home" | "other";
type GeneralSplitMode = "single" | "daily" | "weekly" | "milestones";
type QuranSplitMode = "single" | "days" | "parts" | "ayahs";
type QuranMode = "recitation" | "memorization";

type PlanDraft = {
  goalId: string;
  startDate: string;
  dueDate: string;
  category: TaskCategory;
  titlePrefix: string;
  difficulty: string;
  pointsMode: "automatic" | "manual";
  achievementPoints: string;
  rewardPoints: string;
  note: string;
  generalSplitMode: GeneralSplitMode;
  installments: string;
  partDescriptions: string[];
  quranMode: QuranMode;
  surahNumber: string;
  fromAyah: string;
  toAyah: string;
  quranSplitMode: QuranSplitMode;
  quranSplitValue: string;
};

type PlanPeriod = {
  label: string;
  startDate: string;
  dueDate: string;
};

type Surah = {
  surah_number: number;
  surah_name_ar: string;
  ayah_count: number;
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
  milestones: "مراحل مخصصة",
  "حفظ قرآني": "خطة حفظ قرآني",
  "تلاوة قرآنية": "خطة تلاوة قرآنية"
};

const categories: Array<{ id: TaskCategory; icon: string; label: string }> = [
  { id: "quran", icon: "📖", label: "قرآن" },
  { id: "educational", icon: "📚", label: "تعليمية" },
  { id: "behavior", icon: "🌟", label: "سلوكية" },
  { id: "home", icon: "🏠", label: "منزلية" },
  { id: "other", icon: "✨", label: "أخرى" }
];

const emptyTaskSummary: TaskSummary = { total: 0, pending: 0, submitted: 0, approved: 0 };

function toIsoDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function todayIso() {
  return toIsoDate(new Date());
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function durationDays(draft: PlanDraft | null) {
  if (!draft?.startDate || !draft.dueDate) return 0;
  const start = new Date(`${draft.startDate}T12:00:00`).getTime();
  const due = new Date(`${draft.dueDate}T12:00:00`).getTime();
  return Math.floor((due - start) / 86_400_000) + 1;
}

function estimateGeneralTaskCount(draft: PlanDraft | null) {
  const days = durationDays(draft);
  if (!draft || days <= 0) return 0;
  if (draft.generalSplitMode === "single") return 1;
  if (draft.generalSplitMode === "daily") return days;
  if (draft.generalSplitMode === "weekly") return Math.ceil(days / 7);
  return Math.max(0, Number(draft.installments || 0));
}

function estimateQuranTaskCount(draft: PlanDraft | null, surah: Surah | null) {
  if (!draft || !surah) return 0;
  const from = Number(draft.fromAyah || 0);
  const to = Number(draft.toAyah || 0);
  const total = Math.max(0, to - from + 1);
  if (!total) return 0;
  if (draft.quranSplitMode === "single") return 1;
  if (draft.quranSplitMode === "days") return Math.min(Math.max(durationDays(draft), 1), total);
  if (draft.quranSplitMode === "parts") return Math.min(Math.max(Number(draft.quranSplitValue || 1), 1), total);
  return Math.ceil(total / Math.max(Number(draft.quranSplitValue || 1), 1));
}

function buildPlanPeriods(draft: PlanDraft | null): PlanPeriod[] {
  const count = estimateGeneralTaskCount(draft);
  if (!draft || count < 1) return [];

  const start = new Date(`${draft.startDate}T12:00:00`);
  const due = new Date(`${draft.dueDate}T12:00:00`);
  const totalDays = Math.floor((due.getTime() - start.getTime()) / 86_400_000) + 1;

  return Array.from({ length: count }, (_, index) => {
    let periodStart = new Date(start);
    let periodDue = new Date(due);

    if (draft.generalSplitMode === "daily") {
      periodStart.setDate(start.getDate() + index);
      periodDue = new Date(periodStart);
    } else if (draft.generalSplitMode === "weekly") {
      periodStart.setDate(start.getDate() + index * 7);
      periodDue = new Date(periodStart);
      periodDue.setDate(periodDue.getDate() + 6);
      if (periodDue > due) periodDue = new Date(due);
    } else if (draft.generalSplitMode === "milestones") {
      const startOffset = Math.floor((index * totalDays) / count);
      const nextOffset = Math.floor(((index + 1) * totalDays) / count);
      periodStart.setDate(start.getDate() + startOffset);
      periodDue = index === count - 1 ? new Date(due) : new Date(start);
      if (index !== count - 1) periodDue.setDate(start.getDate() + Math.max(startOffset, nextOffset - 1));
    }

    const label = draft.generalSplitMode === "weekly"
      ? `الأسبوع ${index + 1} من ${count}`
      : draft.generalSplitMode === "daily"
        ? `اليوم ${index + 1} من ${count}`
        : draft.generalSplitMode === "milestones"
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
  if (message.includes("نطاق الآيات") || message.includes("اختر نطاق")) return "تحقق من بداية الآيات ونهايتها.";
  if (message.includes("غير مصرح")) return "لا تملك صلاحية تعديل هذا الهدف.";
  return message;
}

export default function ParentGoalWorkspace({ studentId }: { studentId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [surahs, setSurahs] = useState<Surah[]>([]);
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
    const [goalResult, taskResult, surahResult] = await Promise.all([
      client
        .from("goals")
        .select("id, title, description, goal_type, status, target_value, required_points, start_date, due_date, progress, decision_note, task_plan_mode, task_plan_count")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      client
        .from("tasks")
        .select("goal_id, status")
        .eq("student_id", studentId)
        .not("goal_id", "is", null),
      client.rpc("get_quran_surah_catalog")
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

    if (!surahResult.error) setSurahs((surahResult.data || []) as Surah[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadGoals();
  }, [studentId]);

  useEffect(() => {
    async function loadSuggestedPoints() {
      if (!planDraft || planDraft.pointsMode !== "automatic" || !supabase) return;
      const result = await supabase.rpc("suggest_task_points", {
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

    void loadSuggestedPoints();
  }, [planDraft?.goalId, planDraft?.category, planDraft?.difficulty, planDraft?.pointsMode, studentId]);

  const pendingCount = useMemo(
    () => goals.filter((goal) => goal.status === "pending" || goal.status === "requested").length,
    [goals]
  );

  const selectedSurah = useMemo(() => {
    if (!planDraft) return null;
    return surahs.find((surah) => surah.surah_number === Number(planDraft.surahNumber)) || null;
  }, [planDraft?.surahNumber, surahs]);

  function updatePlanDraft(patch: Partial<PlanDraft>) {
    setPlanDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (next.category === "quran") return next;
      const count = estimateGeneralTaskCount(next);
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
    const firstSurah = surahs[0];
    const initialCategory: TaskCategory = goal.goal_type === "educational"
      ? "educational"
      : goal.goal_type === "behavioral"
        ? "behavior"
        : "other";

    const draft: PlanDraft = {
      goalId: goal.id,
      startDate,
      dueDate: goal.due_date || addDays(startDate, 30),
      category: initialCategory,
      titlePrefix: goal.title || "",
      difficulty: "medium",
      pointsMode: "automatic",
      achievementPoints: "10",
      rewardPoints: "1",
      note: goal.description || goal.decision_note || "",
      generalSplitMode: "weekly",
      installments: "4",
      partDescriptions: [],
      quranMode: "memorization",
      surahNumber: String(firstSurah?.surah_number || 1),
      fromAyah: "1",
      toAyah: String(firstSurah?.ayah_count || 7),
      quranSplitMode: "days",
      quranSplitValue: "2"
    };
    draft.partDescriptions = Array.from({ length: estimateGeneralTaskCount(draft) }, () => "");
    setPlanDraft(draft);
  }

  function chooseCategory(category: TaskCategory) {
    updatePlanDraft({ category });
  }

  function chooseSurah(value: string) {
    const surah = surahs.find((item) => item.surah_number === Number(value));
    updatePlanDraft({
      surahNumber: value,
      fromAyah: "1",
      toAyah: String(surah?.ayah_count || 1)
    });
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !reviewDraft) return;

    if (reviewDraft.decision === "approved" && (!reviewDraft.startDate || !reviewDraft.dueDate)) {
      setError("حدد بداية الهدف وتاريخ استحقاقه قبل الموافقة.");
      return;
    }

    setBusyId(reviewDraft.goalId);
    setError("");
    setSuccess("");
    const result = await supabase.rpc("review_child_goal", {
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
    if (!supabase || !planDraft) return;

    if (!planDraft.startDate || !planDraft.dueDate || planDraft.dueDate < planDraft.startDate) {
      setError("تحقق من تاريخ البداية والاستحقاق قبل إنشاء المهام.");
      return;
    }

    setBusyId(planDraft.goalId);
    setError("");
    setSuccess("");

    if (planDraft.category === "quran") {
      if (!selectedSurah) {
        setBusyId("");
        setError("تعذر تحميل قائمة السور الآن.");
        return;
      }

      const from = Number(planDraft.fromAyah);
      const to = Number(planDraft.toAyah);
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > selectedSurah.ayah_count) {
        setBusyId("");
        setError(`اختر نطاقًا صحيحًا بين الآية 1 والآية ${selectedSurah.ayah_count}.`);
        return;
      }

      const result = await supabase.rpc("convert_goal_to_quran_task_plan", {
        p_goal_id: planDraft.goalId,
        p_quran_mode: planDraft.quranMode,
        p_surah_number: Number(planDraft.surahNumber),
        p_from_ayah: from,
        p_to_ayah: to,
        p_start_date: planDraft.startDate,
        p_due_date: planDraft.dueDate,
        p_split_mode: planDraft.quranSplitMode,
        p_split_value: Math.max(Number(planDraft.quranSplitValue || 1), 1),
        p_title_prefix: planDraft.titlePrefix.trim() || null,
        p_notes: planDraft.note.trim() || null,
        p_difficulty: planDraft.difficulty,
        p_points_mode: planDraft.pointsMode,
        p_achievement_points: Number(planDraft.achievementPoints || 0),
        p_reward_points: Number(planDraft.rewardPoints || 0)
      });
      setBusyId("");

      if (result.error) {
        setError(friendlyError(result.error.message));
        return;
      }

      const count = Number(result.data?.task_count || estimateQuranTaskCount(planDraft, selectedSurah));
      setSuccess(`تم اعتماد الهدف وتحويله إلى خطة ${planDraft.quranMode === "memorization" ? "حفظ" : "تلاوة"} مكوّنة من ${count} ${count === 1 ? "مهمة" : "مهام"}.`);
    } else {
      const taskCount = estimateGeneralTaskCount(planDraft);
      if (taskCount < 1) {
        setBusyId("");
        setError("اختر طريقة تقسيم صحيحة وحدد عدد المراحل عند الحاجة.");
        return;
      }

      const result = await supabase.rpc("convert_goal_to_task_plan_v2", {
        p_goal_id: planDraft.goalId,
        p_start_date: planDraft.startDate,
        p_due_date: planDraft.dueDate,
        p_split_mode: planDraft.generalSplitMode,
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
    }

    setPlanDraft(null);
    await loadGoals();
  }

  async function updateGoal(id: string, patch: Record<string, unknown>, successMessage: string) {
    if (!supabase) return;
    setBusyId(id);
    setError("");
    setSuccess("");
    const result = await supabase.from("goals").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    setBusyId("");
    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    setSuccess(successMessage);
    await loadGoals();
  }

  async function deleteGoal(id: string) {
    if (!supabase || !window.confirm("هل تريد حذف هذا الهدف؟")) return;
    setBusyId(id);
    setError("");
    setSuccess("");
    const result = await supabase.from("goals").delete().eq("id", id);
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
          <h2>أهداف الطفل وقراراتها</h2>
          <p>راجع الهدف الذي أرسله الطفل، ثم وافق عليه أو ارفضه أو حوّله مباشرة إلى مهام قابلة للتقسيم.</p>
        </div>
        <div className="goal-head-actions">
          {pendingCount > 0 && <span className="pending-goals-badge">{pendingCount} تنتظر قرارك</span>}
        </div>
      </div>

      {error && <p className="form-message error-message goal-workspace-message">{error}</p>}
      {success && <p className="form-message success-message goal-workspace-message">{success}</p>}

      {goals.length === 0 ? (
        <div className="goals-empty-state"><span>🎯</span><h3>لا توجد أهداف مرسلة بعد</h3><p>عندما يحدد الطفل هدفًا من حسابه سيظهر هنا لتراجعه وتتخذ القرار المناسب.</p></div>
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
            const planPeriods = planIsOpen && planDraft?.category !== "quran" ? buildPlanPeriods(planDraft) : [];
            const estimatedCount = planDraft?.category === "quran"
              ? estimateQuranTaskCount(planDraft, selectedSurah)
              : estimateGeneralTaskCount(planDraft);

            return (
              <article className={`goal-card goal-decision-card goal-card-${goal.status}`} key={goal.id}>
                <div className="goal-card-head">
                  <div>
                    <span className={`goal-status goal-status-${goal.status}`}>{statusLabels[goal.status] || goal.status}</span>
                    <h3>{goal.title || "هدف بدون عنوان"}</h3>
                    <p>{typeLabels[goal.goal_type] || goal.goal_type}</p>
                  </div>
                  <div className="goal-date-stack"><small>الاستحقاق</small><time>{formatDate(goal.due_date)}</time></div>
                </div>

                {goal.description && <p className="goal-description">{goal.description}</p>}

                <div className="goal-facts goal-facts-expanded">
                  <span><small>القيمة</small><strong>{goal.target_value ? `${goal.target_value} ر.س` : "غير محددة"}</strong></span>
                  <span><small>النقاط المطلوبة</small><strong>{goal.required_points || 0} 💎</strong></span>
                  <span><small>مدة الهدف</small><strong>{goal.start_date ? `${formatDate(goal.start_date)} — ${formatDate(goal.due_date)}` : "بانتظار القرار"}</strong></span>
                  <span><small>خطة التنفيذ</small><strong>{goal.task_plan_mode ? `${planModeLabels[goal.task_plan_mode] || goal.task_plan_mode} · ${goal.task_plan_count || taskSummary.total}` : hasTasks ? `${taskSummary.total} مهام` : "لم تُنشأ بعد"}</strong></span>
                </div>

                {goal.decision_note && <div className={`goal-decision-note ${goal.status === "rejected" ? "rejected" : ""}`}><strong>{goal.status === "rejected" ? "سبب الرفض" : "ملاحظة ولي الأمر"}</strong><p>{goal.decision_note}</p></div>}

                {hasTasks && <div className="goal-task-summary"><div><span>المهام</span><strong>{taskSummary.total || goal.task_plan_count || 0}</strong></div><div><span>قيد التنفيذ</span><strong>{taskSummary.pending}</strong></div><div><span>تنتظر المراجعة</span><strong>{taskSummary.submitted}</strong></div><div><span>مكتملة</span><strong>{taskSummary.approved}</strong></div></div>}

                <div className="progress-row"><div className="progress-row-head"><span>نسبة الإنجاز</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>

                <div className="goal-actions goal-decision-actions">
                  {canReview && <><button type="button" disabled={busyId === goal.id} onClick={() => openReview(goal, "approved")}>✓ موافقة</button><button className="danger-goal-action" type="button" disabled={busyId === goal.id} onClick={() => openReview(goal, "rejected")}>رفض</button></>}
                  {canPlan && <button className="goal-plan-action" type="button" disabled={busyId === goal.id} onClick={() => openPlanner(goal)}>🗂 تحويل إلى مهام</button>}
                  {hasTasks && <Link className="goal-task-link" href={`/children/${studentId}/tasks?goal=${goal.id}`}>إدارة المهام المرتبطة</Link>}
                  {goal.status === "approved" && <button className="secondary-goal-action" type="button" disabled={busyId === goal.id} onClick={() => updateGoal(goal.id, { status: "paused" }, "تم إيقاف الهدف مؤقتًا.")}>إيقاف مؤقت</button>}
                  {goal.status === "paused" && <button className="secondary-goal-action" type="button" disabled={busyId === goal.id} onClick={() => updateGoal(goal.id, { status: "approved" }, "تم استئناف الهدف.")}>استئناف</button>}
                  {(goal.status === "pending" || goal.status === "requested" || goal.status === "rejected") && !hasTasks && <button className="danger-goal-action subtle-delete-action" type="button" disabled={busyId === goal.id} onClick={() => deleteGoal(goal.id)}>حذف</button>}
                </div>

                {reviewIsOpen && reviewDraft && (
                  <form className={`goal-inline-panel goal-review-panel ${reviewDraft.decision}`} onSubmit={submitReview}>
                    <div className="goal-inline-panel-head"><div><span>{reviewDraft.decision === "approved" ? "اعتماد الهدف" : "رفض الهدف"}</span><h4>{reviewDraft.decision === "approved" ? "حدد المدة قبل الموافقة" : "أضف سببًا واضحًا للطفل"}</h4></div><button type="button" onClick={() => setReviewDraft(null)}>×</button></div>
                    {reviewDraft.decision === "approved" && <div className="goal-plan-grid two-columns"><label>تاريخ البداية<input type="date" value={reviewDraft.startDate} onChange={(event) => setReviewDraft({ ...reviewDraft, startDate: event.target.value })} required /></label><label>تاريخ الاستحقاق<input type="date" min={reviewDraft.startDate} value={reviewDraft.dueDate} onChange={(event) => setReviewDraft({ ...reviewDraft, dueDate: event.target.value })} required /></label></div>}
                    <label>{reviewDraft.decision === "approved" ? "ملاحظة للطفل (اختياري)" : "سبب الرفض"}<textarea rows={3} value={reviewDraft.note} onChange={(event) => setReviewDraft({ ...reviewDraft, note: event.target.value })} placeholder={reviewDraft.decision === "approved" ? "مثال: ابدأ بخطوات بسيطة وراجع تقدمك كل أسبوع" : "اشرح سبب الرفض أو ما يحتاجه الهدف ليُقبل لاحقًا"} /></label>
                    <div className="goal-inline-submit-row"><button className={reviewDraft.decision === "rejected" ? "danger-submit" : ""} type="submit" disabled={busyId === goal.id}>{busyId === goal.id ? "جارٍ الحفظ..." : reviewDraft.decision === "approved" ? "تأكيد الموافقة" : "تأكيد الرفض"}</button><button className="cancel-inline-action" type="button" onClick={() => setReviewDraft(null)}>إلغاء</button></div>
                  </form>
                )}

                {planIsOpen && planDraft && (
                  <form className="goal-inline-panel goal-plan-panel" onSubmit={submitPlan}>
                    <div className="goal-inline-panel-head"><div><span>تحويل الهدف إلى مهام</span><h4>اختر نوع المهمة ثم حدّد طريقة تقسيمها</h4></div><button type="button" onClick={() => setPlanDraft(null)}>×</button></div>

                    <div className={styles.categorySection}>
                      <span>نوع المهام</span>
                      <div className={styles.categoryGrid}>
                        {categories.map((item) => <button className={`${styles.categoryButton} ${planDraft.category === item.id ? styles.categoryButtonActive : ""}`} type="button" onClick={() => chooseCategory(item.id)} key={item.id}><span>{item.icon}</span>{item.label}</button>)}
                      </div>
                    </div>

                    <div className="goal-plan-grid two-columns"><label>تاريخ البداية<input type="date" value={planDraft.startDate} onChange={(event) => updatePlanDraft({ startDate: event.target.value })} required /></label><label>تاريخ الاستحقاق<input type="date" min={planDraft.startDate} value={planDraft.dueDate} onChange={(event) => updatePlanDraft({ dueDate: event.target.value })} required /></label></div>

                    {planDraft.category === "quran" ? (
                      <section className={styles.quranBox}>
                        <span className={styles.quranSectionTitle}>المهمة القرآنية</span>
                        <div className={styles.quranMode}><button className={planDraft.quranMode === "recitation" ? styles.quranModeActive : ""} type="button" onClick={() => updatePlanDraft({ quranMode: "recitation" })}>📖 تلاوة</button><button className={planDraft.quranMode === "memorization" ? styles.quranModeActive : ""} type="button" onClick={() => updatePlanDraft({ quranMode: "memorization" })}>🧠 حفظ</button></div>
                        <div className="goal-plan-grid two-columns">
                          <label className="full-column">السورة<select value={planDraft.surahNumber} onChange={(event) => chooseSurah(event.target.value)}>{surahs.map((surah) => <option value={surah.surah_number} key={surah.surah_number}>{surah.surah_number}. سورة {surah.surah_name_ar} — {surah.ayah_count} آية</option>)}</select></label>
                          <label>من الآية<input type="number" min="1" max={selectedSurah?.ayah_count || 1} value={planDraft.fromAyah} onChange={(event) => updatePlanDraft({ fromAyah: event.target.value })} /></label>
                          <label>إلى الآية<input type="number" min="1" max={selectedSurah?.ayah_count || 1} value={planDraft.toAyah} onChange={(event) => updatePlanDraft({ toAyah: event.target.value })} /></label>
                          <label>طريقة التقسيم<select value={planDraft.quranSplitMode} onChange={(event) => updatePlanDraft({ quranSplitMode: event.target.value as QuranSplitMode })}><option value="single">مقطع واحد</option><option value="days">تلقائي حسب الأيام</option><option value="parts">عدد محدد من المقاطع</option><option value="ayahs">عدد آيات في كل مقطع</option></select></label>
                          {(planDraft.quranSplitMode === "parts" || planDraft.quranSplitMode === "ayahs") && <label>{planDraft.quranSplitMode === "parts" ? "عدد المقاطع" : "عدد الآيات في كل مقطع"}<input type="number" min="1" value={planDraft.quranSplitValue} onChange={(event) => updatePlanDraft({ quranSplitValue: event.target.value })} /></label>}
                        </div>
                        <p className={styles.helperText}>تظهر كل مرحلة للطفل بمقطع الآيات المحدد، ويمكنه فتح المقاطع القادمة وإنجازها مبكرًا.</p>
                      </section>
                    ) : (
                      <>
                        <fieldset className="goal-split-options"><legend>طريقة التجزئة</legend>{([[
                          "single", "مهمة واحدة", "من البداية حتى الاستحقاق"
                        ], ["daily", "يومي", "مهمة لكل يوم"], ["weekly", "أسبوعي", "مهمة لكل أسبوع"], ["milestones", "مراحل", "عدد تحدده أنت"]] as const).map(([value, title, description]) => <label className={planDraft.generalSplitMode === value ? "active" : ""} key={value}><input type="radio" name={`split-${goal.id}`} value={value} checked={planDraft.generalSplitMode === value} onChange={() => updatePlanDraft({ generalSplitMode: value })} /><strong>{title}</strong><small>{description}</small></label>)}</fieldset>
                        {planDraft.generalSplitMode === "milestones" && <label className="goal-installments-field">عدد المراحل<input type="number" min="2" max="30" step="1" value={planDraft.installments} onChange={(event) => updatePlanDraft({ installments: event.target.value })} required /></label>}
                        <section className="goal-part-descriptions"><div className="goal-part-descriptions-head"><div><span>وصف كل جزء</span><strong>حدد المطلوب من الطفل في كل فترة</strong></div><small>يمكن ترك أي جزء فارغًا ليستخدم الوصف العام تلقائيًا.</small></div><div className="goal-part-description-list">{planPeriods.map((period, index) => <label className="goal-part-description-card" key={`${period.label}-${index}`}><span className="goal-part-description-number">{index + 1}</span><div className="goal-part-description-title"><strong>{period.label}</strong><small>{period.startDate === period.dueDate ? formatDate(period.startDate) : `${formatDate(period.startDate)} — ${formatDate(period.dueDate)}`}</small></div><textarea rows={2} value={planDraft.partDescriptions[index] || ""} onChange={(event) => updatePartDescription(index, event.target.value)} placeholder="اكتب المهمة المطلوبة في هذا الجزء" /></label>)}</div></section>
                      </>
                    )}

                    <div className={styles.planSummary}><span>سيتم إنشاء</span><strong>{estimatedCount} {estimatedCount === 1 ? "مهمة" : "مهام"}</strong><small>{planDraft.category === "quran" ? `${planDraft.quranMode === "memorization" ? "حفظ" : "تلاوة"} سورة ${selectedSurah?.surah_name_ar || ""}` : `موزعة بين ${formatDate(planDraft.startDate)} و${formatDate(planDraft.dueDate)}`}</small></div>

                    <label>عنوان الخطة أو المهام<input value={planDraft.titlePrefix} onChange={(event) => updatePlanDraft({ titlePrefix: event.target.value })} placeholder="يُستخدم عنوان الهدف تلقائيًا" /></label>
                    <div className="goal-plan-grid two-columns"><label>درجة الصعوبة<select value={planDraft.difficulty} onChange={(event) => updatePlanDraft({ difficulty: event.target.value })}><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option><option value="major">إنجاز كبير</option></select></label><label>طريقة النقاط<select value={planDraft.pointsMode} onChange={(event) => updatePlanDraft({ pointsMode: event.target.value as "automatic" | "manual" })}><option value="automatic">تلقائي</option><option value="manual">يدوي</option></select></label></div>
                    <div className="goal-plan-grid two-columns"><label>⭐ نقاط الإنجاز<input type="number" min="0" step="1" value={planDraft.achievementPoints} onChange={(event) => updatePlanDraft({ achievementPoints: event.target.value })} disabled={planDraft.pointsMode === "automatic"} /></label><label>💎 نقاط المكافآت<input type="number" min="0" step="1" value={planDraft.rewardPoints} onChange={(event) => updatePlanDraft({ rewardPoints: event.target.value })} disabled={planDraft.pointsMode === "automatic"} /></label></div>
                    <label>{planDraft.category === "quran" ? "تعليمات الحفظ أو التلاوة" : "وصف عام احتياطي"}<textarea rows={3} value={planDraft.note} onChange={(event) => updatePlanDraft({ note: event.target.value })} placeholder={planDraft.category === "quran" ? "مثال: كرر المقطع ثلاث مرات ثم سمّع غيبًا" : "يظهر للأجزاء التي لم تكتب لها وصفًا مستقلًا"} /></label>
                    <div className="goal-inline-submit-row"><button type="submit" disabled={busyId === goal.id}>{busyId === goal.id ? "جارٍ إنشاء المهام..." : `اعتماد وتحويل إلى ${estimatedCount} ${estimatedCount === 1 ? "مهمة" : "مهام"}`}</button><button className="cancel-inline-action" type="button" onClick={() => setPlanDraft(null)}>إلغاء</button></div>
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
