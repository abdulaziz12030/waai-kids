"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./ParentGoalWorkspace.module.css";

type EducationalProgram = {
  program_key: string;
  program_type: "multiplication" | "religious_science" | string;
  source_slug: string | null;
  title: string;
  short_title: string;
  description: string | null;
  icon: string | null;
  units_count: number | null;
  subject_category: string | null;
};

type Props = {
  goalId: string;
  startDate: string;
  dueDate: string;
  note: string;
  selectedKey: string;
  onSelectedKeyChange: (value: string) => void;
  onCreated: (message: string) => void | Promise<void>;
};

function inclusiveDays(startDate: string, dueDate: string) {
  if (!startDate || !dueDate) return 30;
  const start = new Date(`${startDate}T12:00:00`).getTime();
  const due = new Date(`${dueDate}T12:00:00`).getTime();
  return Math.max(1, Math.floor((due - start) / 86_400_000) + 1);
}

export default function GoalEducationalProgramPlanner({
  goalId,
  startDate,
  dueDate,
  note,
  selectedKey,
  onSelectedKeyChange,
  onCreated
}: Props) {
  const [programs, setPrograms] = useState<EducationalProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fromTable, setFromTable] = useState("1");
  const [toTable, setToTable] = useState("10");
  const [questionsPerStage, setQuestionsPerStage] = useState("10");
  const [passPercentage, setPassPercentage] = useState("80");
  const [multiplicationAchievement, setMultiplicationAchievement] = useState("100");
  const [multiplicationReward, setMultiplicationReward] = useState("10");

  const [durationDays, setDurationDays] = useState(String(inclusiveDays(startDate, dueDate)));
  const [religiousAchievement, setReligiousAchievement] = useState("10");
  const [religiousReward, setReligiousReward] = useState("0");

  useEffect(() => {
    async function loadPrograms() {
      if (!supabase) return;
      setLoading(true);
      const result = await supabase.rpc("get_educational_program_catalog");
      if (result.error) {
        setError("تعذر تحميل البرامج التعليمية المسجلة.");
      } else {
        setPrograms((result.data || []) as EducationalProgram[]);
      }
      setLoading(false);
    }
    void loadPrograms();
  }, []);

  useEffect(() => {
    setDurationDays(String(inclusiveDays(startDate, dueDate)));
  }, [startDate, dueDate]);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.program_key === selectedKey) || null,
    [programs, selectedKey]
  );

  const stageCount = Math.max(0, Number(toTable) - Number(fromTable) + 1);

  async function assignMultiplication() {
    if (!supabase || selectedProgram?.program_type !== "multiplication") return;
    const first = Number(fromTable);
    const last = Number(toTable);
    if (first < 1 || last > 12 || first > last) {
      setError("تحقق من نطاق جداول الضرب المختار.");
      return;
    }

    setSaving(true);
    setError("");
    const result = await supabase.rpc("convert_goal_to_multiplication_program", {
      p_goal_id: goalId,
      p_from_table: first,
      p_to_table: last,
      p_questions_per_stage: Number(questionsPerStage),
      p_pass_percentage: Number(passPercentage),
      p_achievement_points: Math.max(0, Number(multiplicationAchievement || 0)),
      p_reward_points: Math.max(0, Number(multiplicationReward || 0)),
      p_start_date: startDate,
      p_due_date: dueDate || null,
      p_notes: note.trim() || null
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message || "تعذر إسناد برنامج جدول الضرب.");
      return;
    }

    await onCreated(`تم تحويل الهدف إلى مغامرة أبطال جدول الضرب من الجدول ${first} إلى ${last}.`);
  }

  async function assignReligiousProgram() {
    if (!supabase || selectedProgram?.program_type !== "religious_science" || !selectedProgram.source_slug) return;
    const duration = Number(durationDays);
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) {
      setError("مدة البرنامج يجب أن تكون بين يوم و365 يومًا.");
      return;
    }

    setSaving(true);
    setError("");
    const result = await supabase.rpc("convert_goal_to_religious_science_program", {
      p_goal_id: goalId,
      p_catalog_slug: selectedProgram.source_slug,
      p_start_date: startDate,
      p_duration_days: duration,
      p_achievement_points: Math.max(0, Number(religiousAchievement || 0)),
      p_reward_points: Math.max(0, Number(religiousReward || 0)),
      p_notes: note.trim() || null
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message || "تعذر إنشاء البرنامج التعليمي.");
      return;
    }

    const segments = Number(result.data?.scheduled_days || 0);
    await onCreated(`تم تحويل الهدف إلى برنامج ${selectedProgram.short_title}${segments ? ` وتقسيمه إلى ${segments} مقاطع` : ""}.`);
  }

  return (
    <section className={styles.quranBox}>
      <span className={styles.quranSectionTitle}>البرنامج التعليمي المرتبط</span>
      <label>
        اختر المهمة أو البرنامج
        <select value={selectedKey} onChange={(event) => { onSelectedKeyChange(event.target.value); setError(""); }} disabled={loading}>
          <option value="">مهمة تعليمية عامة</option>
          {programs.map((program) => (
            <option value={program.program_key} key={program.program_key}>
              {program.icon || "📚"} {program.short_title}
            </option>
          ))}
        </select>
      </label>

      {loading && <p className={styles.helperText}>جارٍ تحميل البرامج التعليمية المسجلة...</p>}
      {!loading && programs.length === 0 && <p className={styles.helperText}>لا توجد برامج تعليمية منشورة حاليًا، ويمكن إنشاء مهمة تعليمية عامة.</p>}

      {selectedProgram && (
        <>
          <div className={styles.planSummary}>
            <span>{selectedProgram.icon || "📚"} {selectedProgram.subject_category || "برنامج تعليمي"}</span>
            <strong>{selectedProgram.short_title}</strong>
            <small>{selectedProgram.description}</small>
          </div>

          {selectedProgram.program_type === "multiplication" && (
            <>
              <div className="goal-plan-grid two-columns">
                <label>من جدول<select value={fromTable} onChange={(event) => setFromTable(event.target.value)}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
                <label>إلى جدول<select value={toTable} onChange={(event) => setToTable(event.target.value)}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
                <label>أسئلة كل مرحلة<select value={questionsPerStage} onChange={(event) => setQuestionsPerStage(event.target.value)}><option value="5">5 أسئلة</option><option value="10">10 أسئلة</option></select></label>
                <label>نسبة النجاح<select value={passPercentage} onChange={(event) => setPassPercentage(event.target.value)}><option value="70">70٪</option><option value="80">80٪</option><option value="90">90٪</option><option value="100">100٪</option></select></label>
                <label>⭐ نقاط الإنجاز<input type="number" min="0" value={multiplicationAchievement} onChange={(event) => setMultiplicationAchievement(event.target.value)} /></label>
                <label>💎 نقاط المكافآت<input type="number" min="0" value={multiplicationReward} onChange={(event) => setMultiplicationReward(event.target.value)} /></label>
              </div>
              <div className={styles.planSummary}><span>عدد المراحل</span><strong>{stageCount} مراحل</strong><small>تُفتح الجداول بالتتابع ويُحفظ تقدم الطفل تلقائيًا.</small></div>
              <button type="button" disabled={saving || stageCount < 1} onClick={() => void assignMultiplication()}>{saving ? "جارٍ إسناد البرنامج..." : "اعتماد الهدف وإسناد مغامرة جدول الضرب"}</button>
            </>
          )}

          {selectedProgram.program_type === "religious_science" && (
            <>
              <div className="goal-plan-grid two-columns">
                <label>مدة البرنامج بالأيام<input type="number" min="1" max="365" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} /></label>
                <label>عدد الوحدات<input value={`${selectedProgram.units_count || 0} بيتًا`} readOnly /></label>
                <label>⭐ نقاط كل مقطع<input type="number" min="0" value={religiousAchievement} onChange={(event) => setReligiousAchievement(event.target.value)} /></label>
                <label>💎 مكافأة كل مقطع<input type="number" min="0" value={religiousReward} onChange={(event) => setReligiousReward(event.target.value)} /></label>
              </div>
              <p className={styles.helperText}>سيُقسم البرنامج تلقائيًا على المدة بحد أدنى بيتين في كل مقطع، ويظهر للطفل ضمن برامج الحفظ.</p>
              <button type="button" disabled={saving} onClick={() => void assignReligiousProgram()}>{saving ? "جارٍ إنشاء البرنامج..." : `اعتماد الهدف وإنشاء برنامج ${selectedProgram.short_title}`}</button>
            </>
          )}
        </>
      )}

      {error && <p className="form-message error-message">{error}</p>}
    </section>
  );
}
