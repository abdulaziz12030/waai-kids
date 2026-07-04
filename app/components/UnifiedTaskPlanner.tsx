"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import QuranTaskPlanner from "./QuranTaskPlanner";
import MultiplicationTaskPlanner from "./MultiplicationTaskPlanner";
import styles from "./QuranTaskPlanner.module.css";

type TaskCategory = "quran" | "behavior" | "educational" | "home" | "other";

type GoalOption = {
  id: string;
  title: string;
};

const MULTIPLICATION_PROGRAM_ID = "__multiplication_adventure__";

const categories: Array<{ id: TaskCategory; label: string }> = [
  { id: "quran", label: "📖 قرآن: حفظ أو تلاوة" },
  { id: "educational", label: "📚 تعليمية" },
  { id: "behavior", label: "🌟 سلوكية" },
  { id: "home", label: "🏠 منزلية" },
  { id: "other", label: "✨ أخرى" }
];

const difficultyLabels: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  major: "إنجاز كبير"
};

export default function UnifiedTaskPlanner({ studentId }: { studentId: string }) {
  const searchParams = useSearchParams();
  const goalFromUrl = searchParams.get("goal") || "";
  const [open, setOpen] = useState(Boolean(goalFromUrl));
  const [category, setCategory] = useState<TaskCategory>(goalFromUrl ? "educational" : "quran");
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [goalId, setGoalId] = useState(goalFromUrl);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [pointsMode, setPointsMode] = useState<"automatic" | "manual">("automatic");
  const [achievementPoints, setAchievementPoints] = useState("10");
  const [rewardPoints, setRewardPoints] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState("once");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isMultiplicationProgram =
    category === "educational" && goalId === MULTIPLICATION_PROGRAM_ID;

  useEffect(() => {
    async function loadGoals() {
      if (!supabase) return;
      const result = await supabase
        .from("goals")
        .select("id, title")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (!result.error) setGoals((result.data || []) as GoalOption[]);
    }
    void loadGoals();
  }, [studentId]);

  useEffect(() => {
    if (goalFromUrl) {
      setGoalId(goalFromUrl);
      setCategory("educational");
      setOpen(true);
    }
  }, [goalFromUrl]);

  useEffect(() => {
    async function loadSuggestedPoints() {
      if (!supabase || category === "quran" || pointsMode !== "automatic" || isMultiplicationProgram) return;
      const result = await supabase.rpc("suggest_task_points", {
        p_student_id: studentId,
        p_category: category,
        p_difficulty: difficulty
      });
      if (!result.error && result.data?.[0]) {
        setAchievementPoints(String(result.data[0].achievement_points || 0));
        setRewardPoints(String(result.data[0].reward_points || 0));
      }
    }
    void loadSuggestedPoints();
  }, [studentId, category, difficulty, pointsMode, isMultiplicationProgram]);

  function chooseCategory(nextCategory: TaskCategory) {
    setCategory(nextCategory);
    if (nextCategory !== "educational" && goalId === MULTIPLICATION_PROGRAM_ID) {
      setGoalId("");
    }
    setError("");
    setSuccess("");
  }

  async function createGeneralTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (title.trim().length < 3) {
      setError("اكتب عنوانًا واضحًا للمهمة.");
      return;
    }

    if (!supabase || category === "quran") return;

    setSaving(true);
    const result = await supabase.rpc("create_task_for_child_v2", {
      p_student_id: studentId,
      p_goal_id: goalId || null,
      p_title: title.trim(),
      p_description: description.trim(),
      p_category: category,
      p_difficulty: difficulty,
      p_achievement_points: Number(achievementPoints || 0),
      p_reward_points: Number(rewardPoints || 0),
      p_points_mode: pointsMode,
      p_due_date: dueDate || null,
      p_recurrence: recurrence
    });
    setSaving(false);

    if (result.error) {
      setError("تعذر إسناد المهمة. تحقق من البيانات وحاول مرة أخرى.");
      return;
    }

    setSuccess("تم إسناد المهمة وستظهر في حساب الطفل.");
    window.setTimeout(() => window.location.reload(), 900);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <span>إضافة موحدة</span>
          <h2>إسناد مهمة جديدة</h2>
          <p>أضف من مكان واحد مهمة قرآنية للحفظ أو التلاوة، أو مهمة تعليمية أو سلوكية أو منزلية أو عامة.</p>
        </div>
        <button className={styles.toggle} type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "إغلاق الإضافة" : "+ إضافة مهمة"}
        </button>
      </div>

      {open && (
        <div className={styles.form}>
          <div className={`${styles.modeSwitch} ${styles.categorySwitch}`} role="group" aria-label="نوع المهمة">
            {categories.map((item) => (
              <button
                className={category === item.id ? styles.active : ""}
                type="button"
                onClick={() => chooseCategory(item.id)}
                key={item.id}
              >
                {item.label}
              </button>
            ))}
          </div>

          {category === "quran" ? (
            <QuranTaskPlanner studentId={studentId} embedded initiallyOpen />
          ) : (
            <form onSubmit={isMultiplicationProgram ? (event) => event.preventDefault() : createGeneralTask}>
              <div className={styles.grid}>
                <label className={styles.full}>الهدف المرتبط
                  <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
                    <option value="">مهمة عامة بدون هدف</option>
                    {category === "educational" && (
                      <option value={MULTIPLICATION_PROGRAM_ID}>✖️ مغامرة أبطال جدول الضرب</option>
                    )}
                    {goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}
                  </select>
                </label>

                {isMultiplicationProgram ? (
                  <MultiplicationTaskPlanner studentId={studentId} />
                ) : (
                  <>
                    <label className={styles.full}>عنوان المهمة
                      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: قراءة 20 دقيقة" required />
                    </label>

                    <label className={styles.full}>وصف المطلوب
                      <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="اشرح المطلوب للطفل بوضوح" />
                    </label>

                    <label>درجة الصعوبة
                      <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                        <option value="major">إنجاز كبير</option>
                      </select>
                    </label>

                    <label>التكرار
                      <select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}>
                        <option value="once">مرة واحدة</option>
                        <option value="daily">يومي</option>
                        <option value="weekly">أسبوعي</option>
                      </select>
                    </label>

                    <label>تاريخ الاستحقاق
                      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    </label>

                    <label>طريقة احتساب النقاط
                      <select value={pointsMode} onChange={(event) => setPointsMode(event.target.value as "automatic" | "manual")}>
                        <option value="automatic">تلقائي حسب سياسة النقاط</option>
                        <option value="manual">تحديد يدوي</option>
                      </select>
                    </label>

                    <div className={`${styles.points} ${styles.full}`}>
                      <label>⭐ نقاط الإنجاز
                        <input type="number" min="0" step="1" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} disabled={pointsMode === "automatic"} />
                      </label>
                      <label>💎 نقاط المكافآت
                        <input type="number" min="0" step="1" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} disabled={pointsMode === "automatic"} />
                      </label>
                    </div>
                  </>
                )}
              </div>

              {!isMultiplicationProgram && (
                <>
                  <div className={styles.preview}>
                    <strong>ملخص المهمة</strong>
                    {categories.find((item) => item.id === category)?.label} · {difficultyLabels[difficulty]} · {achievementPoints} ⭐ + {rewardPoints} 💎
                  </div>

                  <button className={styles.submit} type="submit" disabled={saving}>
                    {saving ? "جارٍ الإسناد..." : "إسناد المهمة للطفل"}
                  </button>
                  <p className={styles.hint}>يمكن ضبط قيم النقاط التلقائية من <Link href="/settings/points">سياسات النقاط</Link>.</p>
                  {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
                  {success && <p className={`${styles.message} ${styles.success}`}>{success}</p>}
                </>
              )}
            </form>
          )}
        </div>
      )}
    </section>
  );
}
