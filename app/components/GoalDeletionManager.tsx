"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./GoalDeletionManager.module.css";

type GoalRow = {
  id: string;
  title: string | null;
  status: string;
  progress: number | null;
  task_plan_count: number | null;
};

type ManagedGoal = GoalRow & {
  taskCount: number;
  approvedCount: number;
  rewardStatus: string | null;
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

export default function GoalDeletionManager({ studentId }: { studentId: string }) {
  const [goals, setGoals] = useState<ManagedGoal[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadGoals() {
      const client = supabase;
      if (!client) return;

      setLoading(true);
      const [goalResult, taskResult, rewardResult] = await Promise.all([
        client
          .from("goals")
          .select("id, title, status, progress, task_plan_count")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        client
          .from("tasks")
          .select("goal_id, status")
          .eq("student_id", studentId)
          .not("goal_id", "is", null),
        client
          .from("rewards")
          .select("goal_id, status")
          .eq("student_id", studentId)
          .not("goal_id", "is", null)
      ]);

      if (!active) return;

      if (goalResult.error) {
        setError("تعذر تحميل الأهداف الآن.");
        setLoading(false);
        return;
      }

      const taskMap = new Map<string, { total: number; approved: number }>();
      for (const task of taskResult.data || []) {
        if (!task.goal_id) continue;
        const current = taskMap.get(task.goal_id) || { total: 0, approved: 0 };
        current.total += 1;
        if (task.status === "approved") current.approved += 1;
        taskMap.set(task.goal_id, current);
      }

      const rewardMap = new Map<string, string>();
      for (const reward of rewardResult.data || []) {
        if (reward.goal_id) rewardMap.set(reward.goal_id, reward.status);
      }

      setGoals(((goalResult.data || []) as GoalRow[]).map((goal) => {
        const tasks = taskMap.get(goal.id) || { total: 0, approved: 0 };
        return {
          ...goal,
          taskCount: tasks.total || Number(goal.task_plan_count || 0),
          approvedCount: tasks.approved,
          rewardStatus: rewardMap.get(goal.id) || null
        };
      }));
      setLoading(false);
    }

    loadGoals();
    return () => {
      active = false;
    };
  }, [studentId]);

  const sensitiveCount = useMemo(
    () => goals.filter((goal) => goal.approvedCount > 0 || goal.status === "completed" || goal.rewardStatus === "paid").length,
    [goals]
  );

  async function deleteGoal(goal: ManagedGoal) {
    const parts = [
      `سيتم حذف الهدف «${goal.title || "هدف بدون عنوان"}» نهائيًا.`
    ];

    if (goal.taskCount > 0) parts.push(`سيتم أيضًا حذف ${goal.taskCount} من المهام والمراحل المرتبطة.`);
    if (goal.approvedCount > 0) parts.push(`سيتم سحب نقاط ${goal.approvedCount} من المهام المعتمدة وإعادة احتساب رصيد الطفل.`);
    if (goal.rewardStatus) parts.push("سيتم حذف سجل المكافأة المرتبط بهذا الهدف.");
    parts.push("لا يمكن التراجع عن هذه العملية.");

    if (!window.confirm(parts.join("\n\n"))) return;

    const needsTypedConfirmation = goal.approvedCount > 0 || goal.status === "completed" || goal.rewardStatus === "paid";
    if (needsTypedConfirmation) {
      const typed = window.prompt("للتأكيد النهائي اكتب كلمة: حذف");
      if (typed?.trim() !== "حذف") return;
    }

    const client = supabase;
    if (!client) return;

    setBusyId(goal.id);
    setError("");
    setSuccess("");
    const result = await client.rpc("parent_delete_goal_completely", { p_goal_id: goal.id });
    setBusyId("");

    if (result.error) {
      setError(result.error.message.includes("غير مصرح") ? "لا تملك صلاحية حذف هذا الهدف." : "تعذر حذف الهدف الآن.");
      return;
    }

    const details = result.data as { deleted_tasks?: number; removed_point_entries?: number; deleted_rewards?: number } | null;
    setGoals((current) => current.filter((item) => item.id !== goal.id));
    setSuccess(
      `تم حذف الهدف بالكامل${details?.deleted_tasks ? ` مع ${details.deleted_tasks} من المهام` : ""}${details?.removed_point_entries ? " وإعادة احتساب نقاط الطفل" : ""}.`
    );
    window.setTimeout(() => window.location.reload(), 700);
  }

  return (
    <section className={styles.manager}>
      <button className={styles.toggle} type="button" onClick={() => setOpen((current) => !current)}>
        <span className={styles.icon}>🗑️</span>
        <span>
          <strong>إدارة حذف الأهداف</strong>
          <small>حذف الهدف كاملًا مع مهامه وسجلاته المرتبطة</small>
        </span>
        <b>{loading ? "…" : goals.length}</b>
        <i>{open ? "−" : "+"}</i>
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.notice}>
            <span>⚠️</span>
            <p>
              الحذف نهائي. عند وجود مهام معتمدة ستُحذف نقاطها من رصيد الطفل تلقائيًا، وعند وجود مكافأة سيُحذف سجلها أيضًا.
              {sensitiveCount > 0 && <strong> يوجد {sensitiveCount} من الأهداف تحتاج تأكيدًا إضافيًا.</strong>}
            </p>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          {loading ? (
            <p className={styles.loading}>جارٍ تحميل الأهداف...</p>
          ) : goals.length === 0 ? (
            <div className={styles.empty}><span>🎯</span><p>لا توجد أهداف قابلة للحذف.</p></div>
          ) : (
            <div className={styles.list}>
              {goals.map((goal) => (
                <article className={styles.item} key={goal.id}>
                  <div className={styles.info}>
                    <div className={styles.titleRow}>
                      <strong>{goal.title || "هدف بدون عنوان"}</strong>
                      <span>{statusLabels[goal.status] || goal.status}</span>
                    </div>
                    <p>
                      {goal.taskCount > 0 ? `${goal.taskCount} مهام مرتبطة` : "بلا مهام"}
                      {goal.approvedCount > 0 ? ` · ${goal.approvedCount} معتمدة` : ""}
                      {goal.rewardStatus === "paid" ? " · مكافأة ممنوحة" : goal.rewardStatus ? " · مكافأة مستحقة" : ""}
                    </p>
                  </div>
                  <button
                    className={styles.deleteButton}
                    type="button"
                    disabled={busyId === goal.id}
                    onClick={() => deleteGoal(goal)}
                  >
                    {busyId === goal.id ? "جارٍ الحذف..." : "حذف بالكامل"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
