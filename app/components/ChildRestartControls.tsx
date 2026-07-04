"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type RestartAction = "achievement" | "reward" | "allPoints" | "tasks" | "goals" | "quran";

type RestartResult = Record<string, number | string | boolean | null>;

type ChildRestartControlsProps = {
  studentId: string;
  studentName: string;
  achievementPoints: number;
  rewardPoints: number;
  goalCount: number;
  quranPlanCount: number;
  onChanged?: (action: RestartAction, result: RestartResult) => void | Promise<void>;
};

const actionLabels: Record<RestartAction, string> = {
  achievement: "تصفير نقاط الإنجاز",
  reward: "تصفير نقاط المكافآت",
  allPoints: "تصفير الإنجاز والمكافآت",
  tasks: "تصفير جميع المهام",
  goals: "حذف جميع الأهداف",
  quran: "حذف برنامج حفظ القرآن"
};

export default function ChildRestartControls({
  studentId,
  studentName,
  achievementPoints,
  rewardPoints,
  goalCount,
  quranPlanCount,
  onChanged
}: ChildRestartControlsProps) {
  const [confirming, setConfirming] = useState<RestartAction | null>(null);
  const [busy, setBusy] = useState<RestartAction | null>(null);
  const [taskCount, setTaskCount] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTaskCount() {
      const client = supabase;
      if (!client) {
        setLoadingTasks(false);
        return;
      }

      const result = await client
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId);

      if (cancelled) return;
      setTaskCount(result.count || 0);
      setLoadingTasks(false);
    }

    void loadTaskCount();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const disabled: Record<RestartAction, boolean> = {
    achievement: achievementPoints <= 0,
    reward: rewardPoints <= 0,
    allPoints: achievementPoints <= 0 && rewardPoints <= 0,
    tasks: loadingTasks || taskCount <= 0,
    goals: goalCount <= 0,
    quran: quranPlanCount <= 0
  };

  async function runAction(action: RestartAction) {
    const client = supabase;
    if (!client || busy) return;

    setMessage("");
    setError("");

    if (confirming !== action) {
      setConfirming(action);
      return;
    }

    setBusy(action);
    const rpcName = action === "achievement"
      ? "parent_zero_student_achievement_points"
      : action === "reward"
        ? "parent_zero_student_reward_points"
        : action === "allPoints"
          ? "parent_zero_student_points"
          : action === "tasks"
            ? "parent_zero_student_tasks"
            : action === "goals"
              ? "parent_delete_all_student_goals"
              : "reset_student_quran_program_shared";

    const result = await client.rpc(rpcName, { p_student_id: studentId });
    setBusy(null);

    if (result.error) {
      setError(result.error.message || "تعذر تنفيذ العملية الآن.");
      return;
    }

    const data = (result.data || {}) as RestartResult;
    if (action === "achievement") {
      setMessage(`تم تصفير نقاط إنجاز ${studentName} مع إبقاء نقاط المكافآت وسجل العمليات.`);
    } else if (action === "reward") {
      setMessage(`تم تصفير نقاط مكافآت ${studentName} مع إبقاء نقاط الإنجاز وسجل العمليات.`);
    } else if (action === "allPoints") {
      setMessage(`تم تصفير نقاط الإنجاز والمكافآت الخاصة بـ ${studentName} مع الاحتفاظ بسجل العمليات السابق.`);
    } else if (action === "tasks") {
      const deletedTasks = Number(data.deleted_tasks || taskCount);
      setTaskCount(0);
      setMessage(`تم تصفير ${deletedTasks} من مهام ${studentName} وإشعاراتها، مع إبقاء الأهداف والنقاط وبرامج الحفظ.`);
    } else if (action === "goals") {
      setMessage(`تم حذف ${Number(data.deleted_goals || goalCount)} من الأهداف والمهام المرتبطة بها، ويمكن البدء من جديد.`);
    } else {
      setMessage(`تم حذف ${Number(data.deleted_plans || quranPlanCount)} من خطط الحفظ وجميع المقاطع والتسجيلات التابعة لها.`);
    }

    setConfirming(null);
    await onChanged?.(action, data);
  }

  function confirmationText(action: RestartAction) {
    if (action === "achievement") {
      return `سيصبح رصيد إنجاز ${studentName} صفرًا، وستبقى المكافآت وسجل النقاط السابق محفوظين.`;
    }
    if (action === "reward") {
      return `سيصبح رصيد مكافآت ${studentName} صفرًا، وستبقى نقاط الإنجاز وسجل النقاط السابق محفوظين.`;
    }
    if (action === "allPoints") {
      return `سيصبح رصيد الإنجاز والمكافآت لدى ${studentName} صفرًا، مع الاحتفاظ بتاريخ جميع العمليات السابقة.`;
    }
    if (action === "tasks") {
      return `سيتم حذف جميع مهام ${studentName} وعددها ${taskCount} مهمة، بما فيها المهام القرآنية الموجودة في صفحة المهام، مع حذف إشعاراتها. ستبقى الأهداف والنقاط السابقة وبرامج الحفظ والهدايا محفوظة.`;
    }
    if (action === "goals") {
      return `سيتم حذف جميع أهداف ${studentName} والمهام المرتبطة بها نهائيًا. لن يُحذف برنامج حفظ القرآن.`;
    }
    return `سيتم حذف جميع خطط حفظ القرآن والمقاطع والتسميعات والتسجيلات الخاصة بـ ${studentName} نهائيًا.`;
  }

  function actionButton(action: RestartAction, label: string) {
    const isConfirming = confirming === action;
    const isBusy = busy === action;

    return (
      <div className="restart-action-controls">
        <button
          className={isConfirming ? "restart-confirm-button" : "restart-primary-button"}
          type="button"
          disabled={disabled[action] || Boolean(busy)}
          onClick={() => runAction(action)}
        >
          {isBusy ? "جارٍ التنفيذ..." : isConfirming ? `تأكيد: ${label}` : label}
        </button>
        {isConfirming && !isBusy && (
          <button className="restart-cancel-button" type="button" onClick={() => setConfirming(null)}>
            إلغاء
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="child-restart-panel">
      <div className="child-restart-head">
        <div>
          <span className="section-label">إدارة الأرصدة والبداية الجديدة</span>
          <h2>التحكم في بيانات {studentName}</h2>
          <p>كل عملية مستقلة؛ يمكن تصفير النقاط أو المهام دون التأثير في بقية بيانات الطفل.</p>
        </div>
        <span className="restart-lock-badge">🔒 لولي الأمر فقط</span>
      </div>

      {error && <p className="form-message error-message" aria-live="polite">{error}</p>}
      {message && <p className="form-message success-message" aria-live="polite">{message}</p>}

      <div className="child-restart-grid">
        <article className="restart-action-card">
          <span className="restart-action-icon">⭐</span>
          <div>
            <h3>نقاط الإنجاز</h3>
            <strong>{achievementPoints} نقطة</strong>
            <p>تصفير رصيد الإنجاز فقط، مع بقاء المكافآت والأهداف والمهام وسجل النقاط.</p>
          </div>
          {confirming === "achievement" && <div className="restart-confirmation-note">{confirmationText("achievement")}</div>}
          {actionButton("achievement", actionLabels.achievement)}
        </article>

        <article className="restart-action-card">
          <span className="restart-action-icon">💎</span>
          <div>
            <h3>نقاط المكافآت</h3>
            <strong>{rewardPoints} نقطة</strong>
            <p>تصفير رصيد المكافآت فقط، مع بقاء الإنجاز والأهداف والمهام وسجل النقاط.</p>
          </div>
          {confirming === "reward" && <div className="restart-confirmation-note">{confirmationText("reward")}</div>}
          {actionButton("reward", actionLabels.reward)}
        </article>

        <article className="restart-action-card warning">
          <span className="restart-action-icon">🔄</span>
          <div>
            <h3>جميع النقاط</h3>
            <strong>{achievementPoints + rewardPoints} نقطة إجمالًا</strong>
            <p>تصفير الإنجاز والمكافآت معًا دون حذف المهام أو الأهداف أو تاريخ العمليات.</p>
          </div>
          {confirming === "allPoints" && <div className="restart-confirmation-note">{confirmationText("allPoints")}</div>}
          {actionButton("allPoints", actionLabels.allPoints)}
        </article>

        <article className="restart-action-card warning">
          <span className="restart-action-icon">✅</span>
          <div>
            <h3>جميع المهام</h3>
            <strong>{loadingTasks ? "جارٍ العد..." : `${taskCount} مهمة`}</strong>
            <p>حذف جميع المهام وإشعاراتها، مع إبقاء الأهداف والنقاط والهدايا وبرامج الحفظ كما هي.</p>
          </div>
          {confirming === "tasks" && <div className="restart-confirmation-note">{confirmationText("tasks")}</div>}
          {actionButton("tasks", actionLabels.tasks)}
        </article>

        <article className="restart-action-card warning">
          <span className="restart-action-icon">🎯</span>
          <div>
            <h3>الأهداف الحالية</h3>
            <strong>{goalCount} هدف</strong>
            <p>حذف جميع الأهداف والمهام الناتجة عنها، مع الاحتفاظ بالمهام المستقلة وبرنامج الحفظ.</p>
          </div>
          {confirming === "goals" && <div className="restart-confirmation-note">{confirmationText("goals")}</div>}
          {actionButton("goals", actionLabels.goals)}
        </article>

        <article className="restart-action-card danger">
          <span className="restart-action-icon">📖</span>
          <div>
            <h3>برنامج حفظ القرآن</h3>
            <strong>{quranPlanCount} خطة</strong>
            <p>حذف جميع خطط الحفظ ومقاطعها والتسميعات التابعة لها لبدء برنامج جديد.</p>
          </div>
          {confirming === "quran" && <div className="restart-confirmation-note">{confirmationText("quran")}</div>}
          {actionButton("quran", actionLabels.quran)}
        </article>
      </div>
    </section>
  );
}
