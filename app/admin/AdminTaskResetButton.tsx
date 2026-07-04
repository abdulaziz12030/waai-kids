"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./admin.module.css";

type Student = {
  id: string;
  full_name: string;
  tasks_count: number;
};

type Props = {
  student: Student;
  disabled?: boolean;
  onReset: () => void | Promise<void>;
};

export default function AdminTaskResetButton({ student, disabled = false, onReset }: Props) {
  const [busy, setBusy] = useState(false);

  async function resetTasks() {
    const client = supabase;
    if (!client || busy || student.tasks_count <= 0) return;

    if (!window.confirm(`سيتم حذف جميع مهام ${student.full_name} وعددها ${student.tasks_count} مهمة وإشعاراتها، مع إبقاء الأهداف والنقاط وبرامج الحفظ والهدايا. متابعة؟`)) return;

    const requiredPhrase = "تصفير المهام";
    const confirmation = window.prompt(`اكتب العبارة التالية حرفيًا:\n${requiredPhrase}`, "");
    if (confirmation !== requiredPhrase) {
      window.alert("لم يتم التنفيذ لأن عبارة التأكيد غير صحيحة.");
      return;
    }

    const reason = window.prompt("سبب تصفير المهام:", "تصفير إداري لمهام الطفل") || "تصفير إداري لمهام الطفل";
    setBusy(true);
    const result = await client.rpc("admin_reset_student_tasks", {
      p_student_id: student.id,
      p_reason: reason
    });
    setBusy(false);

    if (result.error) {
      window.alert("تعذر تصفير المهام. تحقق من صلاحيات الآدمين ثم حاول مرة أخرى.");
      return;
    }

    const payload = (result.data || {}) as { deleted_tasks?: number };
    window.alert(`تم تصفير ${Number(payload.deleted_tasks || student.tasks_count)} من مهام ${student.full_name} وتسجيل العملية.`);
    await onReset();
  }

  return (
    <button
      className={styles.dangerButton}
      type="button"
      disabled={disabled || busy || student.tasks_count <= 0}
      onClick={() => void resetTasks()}
    >
      {busy ? "جارٍ تصفير المهام..." : "تصفير المهام"}
    </button>
  );
}
