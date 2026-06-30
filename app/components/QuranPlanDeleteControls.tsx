"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

type QuranPlanDeleteControlsProps = {
  studentId: string;
  studentName: string;
  selectedPlan: { id: string; title: string } | null;
  planCount: number;
  onChanged: () => void | Promise<void>;
};

type DeleteAction = "plan" | "program";

export default function QuranPlanDeleteControls({
  studentId,
  studentName,
  selectedPlan,
  planCount,
  onChanged
}: QuranPlanDeleteControlsProps) {
  const [confirming, setConfirming] = useState<DeleteAction | null>(null);
  const [busy, setBusy] = useState<DeleteAction | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function execute(action: DeleteAction) {
    const client = supabase;
    if (!client || busy) return;

    setMessage("");
    setError("");

    if (confirming !== action) {
      setConfirming(action);
      return;
    }

    if (action === "plan" && !selectedPlan) return;

    setBusy(action);
    const result = action === "plan"
      ? await client.rpc("delete_quran_plan_shared", { p_plan_id: selectedPlan?.id })
      : await client.rpc("reset_student_quran_program_shared", { p_student_id: studentId });
    setBusy(null);

    if (result.error) {
      setError(result.error.message || "تعذر حذف برنامج الحفظ.");
      return;
    }

    setMessage(action === "plan"
      ? `تم حذف خطة «${selectedPlan?.title}» وجميع المقاطع التابعة لها.`
      : `تم حذف برنامج حفظ القرآن كاملًا لـ ${studentName}، ويمكن إنشاء برنامج جديد.`);
    setConfirming(null);
    await onChanged();
  }

  if (planCount < 1) return null;

  return (
    <div className="quran-parent-delete-panel">
      <div className="quran-parent-delete-copy">
        <span>إدارة الخطة</span>
        <p>يستطيع ولي الأمر حذف الخطة المحددة أو مسح برنامج الحفظ كاملًا والبدء من جديد.</p>
      </div>

      {error && <p className="form-message error-message" aria-live="polite">{error}</p>}
      {message && <p className="form-message success-message" aria-live="polite">{message}</p>}

      {confirming && (
        <div className="quran-delete-confirmation">
          {confirming === "plan"
            ? `سيتم حذف خطة «${selectedPlan?.title}» ومقاطعها وتسميعاتها نهائيًا.`
            : `سيتم حذف جميع خطط ومقاطع وتسميعات ${studentName} نهائيًا.`}
        </div>
      )}

      <div className="quran-parent-delete-actions">
        <button
          className={confirming === "plan" ? "restart-confirm-button" : "restart-primary-button"}
          type="button"
          disabled={!selectedPlan || Boolean(busy)}
          onClick={() => execute("plan")}
        >
          {busy === "plan" ? "جارٍ حذف الخطة..." : confirming === "plan" ? "تأكيد حذف الخطة" : "حذف الخطة المحددة"}
        </button>
        <button
          className={confirming === "program" ? "restart-confirm-button" : "restart-danger-button"}
          type="button"
          disabled={Boolean(busy)}
          onClick={() => execute("program")}
        >
          {busy === "program" ? "جارٍ حذف البرنامج..." : confirming === "program" ? "تأكيد حذف البرنامج كاملًا" : "حذف برنامج الحفظ كاملًا"}
        </button>
        {confirming && !busy && (
          <button className="restart-cancel-button" type="button" onClick={() => setConfirming(null)}>
            إلغاء
          </button>
        )}
      </div>
    </div>
  );
}
