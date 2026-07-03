"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./GoalQuranTaskPlanner.module.css";

type GoalOption = {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
};

type Surah = {
  surah_number: number;
  surah_name_ar: string;
  ayah_count: number;
};

type QuranMode = "recitation" | "memorization";
type SplitMode = "single" | "days" | "parts" | "ayahs";

function localDateIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function GoalQuranTaskPlanner({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [goalId, setGoalId] = useState("");
  const [mode, setMode] = useState<QuranMode>("memorization");
  const [surahNumber, setSurahNumber] = useState("1");
  const [fromAyah, setFromAyah] = useState("1");
  const [toAyah, setToAyah] = useState("7");
  const [startDate, setStartDate] = useState(localDateIso());
  const [dueDate, setDueDate] = useState(addDays(localDateIso(), 6));
  const [splitMode, setSplitMode] = useState<SplitMode>("days");
  const [splitValue, setSplitValue] = useState("2");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [pointsMode, setPointsMode] = useState<"automatic" | "manual">("automatic");
  const [achievementPoints, setAchievementPoints] = useState("10");
  const [rewardPoints, setRewardPoints] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadOptions() {
    if (!supabase) return;
    setLoading(true);

    const [goalResult, taskResult, surahResult] = await Promise.all([
      supabase
        .from("goals")
        .select("id,title,description,status,start_date,due_date")
        .eq("student_id", studentId)
        .in("status", ["pending", "requested", "approved", "paused"])
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("goal_id")
        .eq("student_id", studentId)
        .not("goal_id", "is", null),
      supabase.rpc("get_quran_surah_catalog")
    ]);

    const usedGoalIds = new Set((taskResult.data || []).map((item) => item.goal_id).filter(Boolean));
    const available = ((goalResult.data || []) as GoalOption[]).filter((goal) => !usedGoalIds.has(goal.id));
    setGoals(available);
    setSurahs((surahResult.data || []) as Surah[]);

    if (available[0]) {
      setGoalId((current) => current || available[0].id);
    }

    setLoading(false);
  }

  useEffect(() => { void loadOptions(); }, [studentId]);

  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === goalId) || null, [goals, goalId]);
  const selectedSurah = useMemo(() => surahs.find((surah) => surah.surah_number === Number(surahNumber)) || null, [surahs, surahNumber]);

  useEffect(() => {
    if (!selectedGoal) return;
    const start = selectedGoal.start_date || localDateIso();
    setStartDate(start);
    setDueDate(selectedGoal.due_date || addDays(start, 6));
    setTitle(selectedGoal.title || "");
    setNotes(selectedGoal.description || "");
  }, [selectedGoal?.id]);

  useEffect(() => {
    if (!selectedSurah) return;
    setFromAyah("1");
    setToAyah(String(selectedSurah.ayah_count));
  }, [selectedSurah?.surah_number]);

  const totalAyahs = Math.max(0, Number(toAyah || 0) - Number(fromAyah || 0) + 1);
  const durationDays = startDate && dueDate
    ? Math.max(1, Math.floor((new Date(`${dueDate}T12:00:00`).getTime() - new Date(`${startDate}T12:00:00`).getTime()) / 86_400_000) + 1)
    : 1;

  const estimatedParts = useMemo(() => {
    if (totalAyahs <= 0) return 0;
    if (splitMode === "single") return 1;
    if (splitMode === "days") return Math.min(durationDays, totalAyahs);
    if (splitMode === "parts") return Math.min(Math.max(Number(splitValue || 1), 1), totalAyahs);
    return Math.ceil(totalAyahs / Math.max(Number(splitValue || 1), 1));
  }, [totalAyahs, splitMode, splitValue, durationDays]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedGoal || !selectedSurah) return;

    setError("");
    setSuccess("");

    const from = Number(fromAyah);
    const to = Number(toAyah);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > selectedSurah.ayah_count) {
      setError(`اختر نطاقًا صحيحًا بين الآية 1 والآية ${selectedSurah.ayah_count}.`);
      return;
    }

    if (!startDate || !dueDate || dueDate < startDate) {
      setError("تحقق من تاريخ البداية والاستحقاق.");
      return;
    }

    setSaving(true);
    const result = await supabase.rpc("convert_goal_to_quran_task_plan", {
      p_goal_id: selectedGoal.id,
      p_quran_mode: mode,
      p_surah_number: Number(surahNumber),
      p_from_ayah: from,
      p_to_ayah: to,
      p_start_date: startDate,
      p_due_date: dueDate,
      p_split_mode: splitMode,
      p_split_value: Math.max(Number(splitValue || 1), 1),
      p_title_prefix: title.trim(),
      p_notes: notes.trim(),
      p_difficulty: difficulty,
      p_points_mode: pointsMode,
      p_achievement_points: Number(achievementPoints || 0),
      p_reward_points: Number(rewardPoints || 0)
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message || "تعذر تحويل الهدف إلى مهمة قرآنية.");
      return;
    }

    const createdCount = Number(result.data?.task_count || estimatedParts || 1);
    setSuccess(`تم تحويل الهدف إلى خطة ${mode === "memorization" ? "حفظ" : "تلاوة"} من ${createdCount} ${createdCount === 1 ? "جزء" : "أجزاء"}. يمكن للطفل فتح الأجزاء القادمة والبدء بها مبكرًا.`);
    window.setTimeout(() => window.location.reload(), 1400);
  }

  return (
    <section className={styles.panel} id="goal-quran-task-planner">
      <div className={styles.head}>
        <div>
          <span>تحويل هدف إلى مهمة قرآنية</span>
          <h2>اختر تلاوة أو حفظًا وقسّم الهدف إلى آيات ومقاطع</h2>
          <p>هذا المسار مخصص لأهداف الطفل التي يحولها ولي الأمر إلى مهام قرآنية. تظهر المقاطع في «مهامي» ويمكن للطفل فتح المقاطع القادمة والبدء بها قبل موعدها.</p>
        </div>
        <button className={styles.toggle} type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "إغلاق" : "+ تحويل هدف قرآني"}
        </button>
      </div>

      {open && (
        loading ? <div className={styles.empty}>جارٍ تحميل الأهداف والسور...</div> : goals.length === 0 ? (
          <div className={styles.empty}>لا يوجد هدف متاح للتحويل حاليًا. يجب أن يكون الهدف بانتظار القرار أو معتمدًا وألا تكون له مهام مرتبطة.</div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <div className={styles.category}>التصنيف المختار: 📖 قرآن</div>

            <div className={styles.grid}>
              <label className={styles.full}>الهدف المراد تحويله
                <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
                  {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title || "هدف بدون عنوان"}</option>)}
                </select>
              </label>
            </div>

            <div className={styles.modeSwitch} role="group" aria-label="نوع المهمة القرآنية">
              <button className={mode === "recitation" ? styles.active : ""} type="button" onClick={() => setMode("recitation")}>📖 تلاوة</button>
              <button className={mode === "memorization" ? styles.active : ""} type="button" onClick={() => setMode("memorization")}>🧠 حفظ</button>
            </div>

            <div className={styles.grid}>
              <label className={styles.full}>السورة
                <select value={surahNumber} onChange={(event) => setSurahNumber(event.target.value)}>
                  {surahs.map((surah) => <option key={surah.surah_number} value={surah.surah_number}>{surah.surah_number}. سورة {surah.surah_name_ar} — {surah.ayah_count} آية</option>)}
                </select>
              </label>

              <label>من الآية<input type="number" min="1" max={selectedSurah?.ayah_count || 1} value={fromAyah} onChange={(event) => setFromAyah(event.target.value)} /></label>
              <label>إلى الآية<input type="number" min="1" max={selectedSurah?.ayah_count || 1} value={toAyah} onChange={(event) => setToAyah(event.target.value)} /></label>
              <label>تاريخ البداية<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label>تاريخ الاستحقاق<input type="date" min={startDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>

              <label>طريقة التقسيم
                <select value={splitMode} onChange={(event) => setSplitMode(event.target.value as SplitMode)}>
                  <option value="single">مقطع واحد</option>
                  <option value="days">تلقائي حسب الأيام</option>
                  <option value="parts">عدد محدد من المقاطع</option>
                  <option value="ayahs">عدد آيات في كل مقطع</option>
                </select>
              </label>

              {splitMode === "parts" && <label>عدد المقاطع<input type="number" min="1" max={totalAyahs || 1} value={splitValue} onChange={(event) => setSplitValue(event.target.value)} /></label>}
              {splitMode === "ayahs" && <label>الآيات في كل مقطع<input type="number" min="1" max={totalAyahs || 1} value={splitValue} onChange={(event) => setSplitValue(event.target.value)} /></label>}

              <label className={styles.full}>عنوان الخطة<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${mode === "memorization" ? "حفظ" : "تلاوة"} سورة ${selectedSurah?.surah_name_ar || ""}`} /></label>
              <label className={styles.full}>تعليمات ولي الأمر<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={mode === "memorization" ? "مثال: كرر المقطع ثم سمّع غيبًا" : "مثال: اقرأ بتأنٍ مع مراعاة أحكام التجويد"} /></label>

              <label>درجة الصعوبة
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option><option value="major">إنجاز كبير</option>
                </select>
              </label>
              <label>طريقة احتساب النقاط
                <select value={pointsMode} onChange={(event) => setPointsMode(event.target.value as "automatic" | "manual")}>
                  <option value="automatic">تلقائي حسب سياسة النقاط</option><option value="manual">تحديد يدوي لكل مقطع</option>
                </select>
              </label>

              <div className={`${styles.points} ${styles.full}`}>
                <label>⭐ نقاط الإنجاز لكل مقطع<input type="number" min="0" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} disabled={pointsMode === "automatic"} /></label>
                <label>💎 نقاط المكافآت لكل مقطع<input type="number" min="0" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} disabled={pointsMode === "automatic"} /></label>
              </div>
            </div>

            <div className={styles.preview}><strong>المعاينة</strong>{mode === "memorization" ? "حفظ" : "تلاوة"} سورة {selectedSurah?.surah_name_ar || "—"} من الآية {fromAyah || "—"} إلى {toAyah || "—"} في نحو {estimatedParts} {estimatedParts === 1 ? "مقطع" : "مقاطع"}. جميع المقاطع القادمة قابلة للفتح والإنجاز المبكر.</div>

            <button className={styles.submit} type="submit" disabled={saving || !selectedGoal || !selectedSurah}>{saving ? "جارٍ إنشاء المقاطع..." : `تحويل الهدف إلى خطة ${mode === "memorization" ? "حفظ" : "تلاوة"}`}</button>
            <p className={styles.hint}>بعد اعتماد جميع المقاطع يظهر خيار التكريم والإهداء مرتبطًا بالهدف والمهمة كاملة.</p>
            {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
            {success && <p className={`${styles.message} ${styles.success}`}>{success}</p>}
          </form>
        )
      )}
    </section>
  );
}
