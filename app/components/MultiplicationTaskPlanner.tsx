"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import styles from "./QuranTaskPlanner.module.css";

export default function MultiplicationTaskPlanner({ studentId }: { studentId: string }) {
  const [fromTable, setFromTable] = useState("1");
  const [toTable, setToTable] = useState("10");
  const [questionsPerStage, setQuestionsPerStage] = useState("10");
  const [passPercentage, setPassPercentage] = useState("80");
  const [achievementPoints, setAchievementPoints] = useState("100");
  const [rewardPoints, setRewardPoints] = useState("10");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const stageCount = useMemo(
    () => Math.max(0, Number(toTable) - Number(fromTable) + 1),
    [fromTable, toTable]
  );

  async function assignProgram() {
    setError("");
    setSuccess("");

    const firstTable = Number(fromTable);
    const lastTable = Number(toTable);

    if (firstTable > lastTable) {
      setError("يجب أن يكون الجدول الأول أصغر من الجدول الأخير أو مساويًا له.");
      return;
    }

    if (!supabase) {
      setError("تعذر الاتصال بالخدمة الآن.");
      return;
    }

    setSaving(true);
    const result = await supabase.rpc("assign_multiplication_program", {
      p_student_id: studentId,
      p_from_table: firstTable,
      p_to_table: lastTable,
      p_questions_per_stage: Number(questionsPerStage),
      p_pass_percentage: Number(passPercentage),
      p_achievement_points: Number(achievementPoints || 0),
      p_reward_points: Number(rewardPoints || 0),
      p_due_date: dueDate || null
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message || "تعذر إسناد مغامرة جدول الضرب.");
      return;
    }

    setSuccess("تم إسناد مغامرة أبطال جدول الضرب، وستظهر مباشرة في حساب الطفل.");
    window.setTimeout(() => window.location.reload(), 900);
  }

  return (
    <>
      <div className={`${styles.preview} ${styles.full}`}>
        <strong>مغامرة تعليمية جاهزة</strong>
        يتعلم الطفل الجدول من بطاقة واضحة، ثم يجيب عن أسئلة اختيار من متعدد. تُفتح المراحل بالتتابع، ويُحفظ التقدم تلقائيًا حتى التكريم النهائي.
      </div>

      <label>من جدول
        <select value={fromTable} onChange={(event) => setFromTable(event.target.value)}>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>

      <label>إلى جدول
        <select value={toTable} onChange={(event) => setToTable(event.target.value)}>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>

      <label>أسئلة كل مرحلة
        <select value={questionsPerStage} onChange={(event) => setQuestionsPerStage(event.target.value)}>
          <option value="5">5 أسئلة سريعة</option>
          <option value="10">10 أسئلة للإتقان</option>
        </select>
      </label>

      <label>نسبة النجاح
        <select value={passPercentage} onChange={(event) => setPassPercentage(event.target.value)}>
          <option value="70">70٪</option>
          <option value="80">80٪</option>
          <option value="90">90٪</option>
          <option value="100">100٪</option>
        </select>
      </label>

      <label>تاريخ الاستحقاق
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </label>

      <label>عدد المراحل
        <input value={`${stageCount} مراحل`} readOnly />
      </label>

      <div className={`${styles.points} ${styles.full}`}>
        <label>⭐ نقاط الإنجاز
          <input type="number" min="0" step="1" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} />
        </label>
        <label>💎 نقاط المكافآت
          <input type="number" min="0" step="1" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} />
        </label>
      </div>

      <div className={`${styles.preview} ${styles.full}`}>
        <strong>ملخص مغامرة جدول الضرب</strong>
        الجداول {fromTable}–{toTable} · {questionsPerStage} أسئلة لكل مرحلة · نجاح {passPercentage}٪ · {achievementPoints} ⭐ + {rewardPoints} 💎
      </div>

      <div className={styles.full}>
        <button className={styles.submit} type="button" disabled={saving} onClick={() => void assignProgram()}>
          {saving ? "جارٍ الإسناد..." : "إسناد مغامرة جدول الضرب للطفل"}
        </button>
        <p className={styles.hint}>
          بعد الإسناد يمكنك <Link href={`/children/${studentId}/multiplication`}>متابعة تقدم الطفل في البرنامج</Link>.
        </p>
        {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
        {success && <p className={`${styles.message} ${styles.success}`}>{success}</p>}
      </div>
    </>
  );
}
