"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./MultiplicationAdventure.module.css";

type Stage = {
  table_number: number;
  status: "locked" | "available" | "completed";
  attempts_count: number;
  best_score: number;
};

type Program = {
  id: string;
  task_id: string;
  assigned_role: "parent" | "teacher";
  from_table: number;
  to_table: number;
  questions_per_stage: number;
  pass_percentage: number;
  status: "active" | "completed" | "cancelled";
  current_table: number;
  completed_tables: number;
  completed_at: string | null;
  due_date: string | null;
  achievement_points: number;
  reward_points: number;
  stages: Stage[];
};

function formatDate(value: string | null) {
  if (!value) return "بدون موعد محدد";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

export default function MultiplicationAssignmentPanel({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName?: string;
}) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [fromTable, setFromTable] = useState("1");
  const [toTable, setToTable] = useState("10");
  const [questions, setQuestions] = useState("10");
  const [passPercentage, setPassPercentage] = useState("80");
  const [achievementPoints, setAchievementPoints] = useState("100");
  const [rewardPoints, setRewardPoints] = useState("10");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPrograms() {
    if (!supabase || !studentId) return;
    setLoading(true);
    const result = await supabase.rpc("get_multiplication_programs_for_student", {
      p_student_id: studentId,
    });
    if (result.error) setError("تعذر تحميل برامج جدول الضرب الآن.");
    else setPrograms((result.data || []) as Program[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadPrograms();
  }, [studentId]);

  const activePrograms = useMemo(() => programs.filter((program) => program.status === "active"), [programs]);

  async function assignProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const first = Number(fromTable);
    const last = Number(toTable);
    if (first > last) {
      setError("يجب أن يكون الجدول الأول أصغر من الجدول الأخير أو مساويًا له.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    const result = await supabase.rpc("assign_multiplication_program", {
      p_student_id: studentId,
      p_from_table: first,
      p_to_table: last,
      p_questions_per_stage: Number(questions),
      p_pass_percentage: Number(passPercentage),
      p_achievement_points: Number(achievementPoints || 0),
      p_reward_points: Number(rewardPoints || 0),
      p_due_date: dueDate || null,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message || "تعذر إسناد البرنامج الآن.");
      return;
    }

    setShowForm(false);
    setMessage(`تم إسناد مغامرة جدول الضرب${studentName ? ` إلى ${studentName}` : ""}، وستظهر مباشرة في حساب الطفل.`);
    await loadPrograms();
  }

  async function deleteProgram(program: Program) {
    if (!supabase || !window.confirm("حذف برنامج جدول الضرب النشط وجميع محاولاته؟")) return;
    setDeletingId(program.id);
    setError("");
    const result = await supabase.rpc("delete_multiplication_program", { p_program_id: program.id });
    setDeletingId("");
    if (result.error) {
      setError(result.error.message || "تعذر حذف البرنامج.");
      return;
    }
    setMessage("تم حذف البرنامج النشط.");
    await loadPrograms();
  }

  return (
    <section className={styles.managementPanel}>
      <div className={styles.managementHero}>
        <div>
          <span className={styles.eyebrow}>برنامج تعليمي تفاعلي</span>
          <h1>مغامرة أبطال جدول الضرب</h1>
          <p>بطاقات للتعلّم أولًا، ثم أسئلة اختيارية متدرجة، وحفظ تلقائي للتقدم حتى التكريم النهائي.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setShowForm((value) => !value)}>
          {showForm ? "إغلاق الإعداد" : "✖️ إسناد برنامج جديد"}
        </button>
      </div>

      {message && <p className={styles.successMessage}>{message}</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      {showForm && (
        <form className={styles.assignmentForm} onSubmit={assignProgram}>
          <div className={styles.formHeading}>
            <div><span>إعداد الرحلة</span><h2>اختر الجداول ومستوى الإتقان</h2></div>
            <strong>{Number(toTable) - Number(fromTable) + 1} مراحل</strong>
          </div>

          <div className={styles.formGrid}>
            <label>من جدول<select value={fromTable} onChange={(event) => setFromTable(event.target.value)}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>إلى جدول<select value={toTable} onChange={(event) => setToTable(event.target.value)}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>أسئلة كل مرحلة<select value={questions} onChange={(event) => setQuestions(event.target.value)}><option value="5">5 أسئلة سريعة</option><option value="10">10 أسئلة للإتقان</option></select></label>
            <label>نسبة النجاح<select value={passPercentage} onChange={(event) => setPassPercentage(event.target.value)}><option value="70">70٪</option><option value="80">80٪</option><option value="90">90٪</option><option value="100">100٪</option></select></label>
            <label>نقاط الإنجاز<input type="number" min="0" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} /></label>
            <label>نقاط المكافآت<input type="number" min="0" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} /></label>
            <label className={styles.fullField}>موعد الإكمال<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>

          <div className={styles.formSummary}>
            <span>👀 بطاقة تعلّم قبل كل اختبار</span>
            <span>🔐 فتح المراحل بالتتابع</span>
            <span>🏆 تكريم بعد الإكمال الكامل</span>
          </div>
          <button className={styles.primaryButton} disabled={saving} type="submit">{saving ? "جارٍ الإسناد..." : "إسناد المغامرة للطفل"}</button>
        </form>
      )}

      <div className={styles.programSectionHead}>
        <div><span className={styles.eyebrow}>المتابعة</span><h2>البرامج المسندة</h2></div>
        <strong>{activePrograms.length} نشطة</strong>
      </div>

      {loading ? <div className={styles.emptyState}>جارٍ تحميل البرامج...</div> : programs.length === 0 ? (
        <div className={styles.emptyState}><span>🧮</span><h3>لم يُسند برنامج بعد</h3><p>ابدأ ببرنامج من جدول 1 إلى 10، ويمكن التوسع حتى جدول 12.</p></div>
      ) : (
        <div className={styles.programGrid}>
          {programs.map((program) => {
            const total = program.to_table - program.from_table + 1;
            const progress = Math.round((program.completed_tables / total) * 100);
            return (
              <article className={styles.programCard} key={program.id}>
                <div className={styles.programCardHead}>
                  <div><span className={styles.programIcon}>{program.status === "completed" ? "🏆" : "✖️"}</span><div><h3>الجداول {program.from_table}–{program.to_table}</h3><p>{program.questions_per_stage} أسئلة · نجاح {program.pass_percentage}٪</p></div></div>
                  <span className={program.status === "completed" ? styles.completedBadge : styles.activeBadge}>{program.status === "completed" ? "مكتمل" : `المرحلة ${program.current_table}`}</span>
                </div>
                <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
                <div className={styles.progressCopy}><strong>{program.completed_tables} من {total} مراحل</strong><span>{progress}٪</span></div>
                <div className={styles.stageStrip}>{program.stages.map((stage) => <span key={stage.table_number} className={stage.status === "completed" ? styles.stageDone : stage.status === "available" ? styles.stageCurrent : styles.stageLocked}>{stage.status === "completed" ? "✓" : stage.table_number}</span>)}</div>
                <div className={styles.programMeta}><span>⭐ {program.achievement_points}</span><span>💎 {program.reward_points}</span><span>📅 {formatDate(program.due_date)}</span></div>
                {program.status === "active" && <button type="button" className={styles.deleteButton} disabled={deletingId === program.id} onClick={() => void deleteProgram(program)}>{deletingId === program.id ? "جارٍ الحذف..." : "حذف البرنامج"}</button>}
                {program.status === "completed" && <p className={styles.recognitionNote}>أُضيفت النقاط وأصبح الإنجاز جاهزًا للتكريم والهدية.</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
