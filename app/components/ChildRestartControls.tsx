"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

type RestartAction = "points" | "goals" | "quran";

type RestartResult = Record<string, number | string | null>;

type ChildRestartControlsProps = {
  studentId: string;
  studentName: string;
  achievementPoints: number;
  goalCount: number;
  quranPlanCount: number;
  onChanged?: (action: RestartAction, result: RestartResult) => void | Promise<void>;
};

const actionLabels: Record<RestartAction, string> = {
  points: "تصفير نقاط الإنجاز",
  goals: "حذف جميع الأهداف",
  quran: "حذف برنامج حفظ القرآن"
};

export default function ChildRestartControls({
  studentId,
  studentName,
  achievementPoints,
  goalCount,
  quranPlanCount,
  onChanged
}: ChildRestartControlsProps) {
  const [confirming, setConfirming] = useState<RestartAction | null>(null);
  const [busy, setBusy] = useState<RestartAction | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const disabled: Record<RestartAction, boolean> = {
    points: achievementPoints <= 0,
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
    const rpcName = action === "points"
      ? "parent_zero_student_achievement_points"
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
    if (action === "points") {
      setMessage(`تم تصفير نقاط الإنجاز الخاصة بـ ${studentName} مع الإبقاء على نقاط المكافآت.`);
    } else if (action === "goals") {
      setMessage(`تم حذف ${Number(data.deleted_goals || goalCount)} من الأهداف والمهام المرتبطة بها، ويمكن البدء من جديد.`);
    } else {
      setMessage(`تم حذف ${Number(data.deleted_plans || quranPlanCount)} من خطط الحفظ وجميع المقاطع والتسجيلات التابعة لها.`);
    }

    setConfirming(null);
    await onChanged?.(action, data);
  }

  function confirmationText(action: RestartAction) {
    if (action === "points") {
      return `سيتم جعل نقاط إنجاز ${studentName} صفرًا، دون حذف نقاط المكافآت أو الأهداف.`;
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
          <span className="section-label">إدارة البداية الجديدة</span>
          <h2>التحكم في بيانات {studentName}</h2>
          <p>كل عملية مستقلة ومحمية بتأكيد إضافي حتى لا تُحذف بيانات أخرى عن طريق الخطأ.</p>
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
            <p>تصفير نقاط الإنجاز فقط، مع بقاء نقاط المكافآت والمهام والأهداف كما هي.</p>
          </div>
          {confirming === "points" && <div className="restart-confirmation-note">{confirmationText("points")}</div>}
          {actionButton("points", actionLabels.points)}
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
