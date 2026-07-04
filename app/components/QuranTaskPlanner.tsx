"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./QuranTaskPlanner.module.css";

type Surah = {
  surah_number: number;
  surah_name_ar: string;
  ayah_count: number;
};

type QuranMode = "recitation" | "memorization";
type SplitMode = "single" | "days" | "parts" | "ayahs";

type QuranTaskPlannerProps = {
  studentId: string;
  embedded?: boolean;
  initiallyOpen?: boolean;
};

function localDateIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function QuranTaskPlanner({ studentId, embedded = false, initiallyOpen = false }: QuranTaskPlannerProps) {
  const [open, setOpen] = useState(initiallyOpen || embedded);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [mode, setMode] = useState<QuranMode>("recitation");
  const [surahNumber, setSurahNumber] = useState("1");
  const [fromAyah, setFromAyah] = useState("1");
  const [toAyah, setToAyah] = useState("7");
  const [startDate, setStartDate] = useState(localDateIso());
  const [durationDays, setDurationDays] = useState("1");
  const [splitMode, setSplitMode] = useState<SplitMode>("single");
  const [splitValue, setSplitValue] = useState("2");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pointsMode, setPointsMode] = useState<"automatic" | "manual">("automatic");
  const [achievementPoints, setAchievementPoints] = useState("10");
  const [rewardPoints, setRewardPoints] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSurahs() {
      if (!supabase) return;
      const result = await supabase.rpc("get_quran_surah_catalog");
      if (!result.error) setSurahs((result.data || []) as Surah[]);
    }
    void loadSurahs();
  }, []);

  const selectedSurah = useMemo(
    () => surahs.find((item) => item.surah_number === Number(surahNumber)) || null,
    [surahs, surahNumber]
  );

  useEffect(() => {
    if (!selectedSurah) return;
    setFromAyah("1");
    setToAyah(String(selectedSurah.ayah_count));
  }, [selectedSurah?.surah_number]);

  const totalAyahs = Math.max(0, Number(toAyah || 0) - Number(fromAyah || 0) + 1);
  const estimatedParts = useMemo(() => {
    if (totalAyahs <= 0) return 0;
    if (splitMode === "single") return 1;
    if (splitMode === "days") return Math.min(Math.max(Number(durationDays || 1), 1), totalAyahs);
    if (splitMode === "parts") return Math.min(Math.max(Number(splitValue || 1), 1), totalAyahs);
    return Math.ceil(totalAyahs / Math.max(Number(splitValue || 1), 1));
  }, [totalAyahs, splitMode, splitValue, durationDays]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedSurah) return;
    setError("");
    setSuccess("");

    const from = Number(fromAyah);
    const to = Number(toAyah);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > selectedSurah.ayah_count) {
      setError(`اختر نطاقًا صحيحًا بين الآية 1 والآية ${selectedSurah.ayah_count}.`);
      return;
    }

    setSaving(true);
    const result = await supabase.rpc("create_quran_task_plan", {
      p_student_id: studentId,
      p_mode: mode,
      p_surah_number: Number(surahNumber),
      p_from_ayah: from,
      p_to_ayah: to,
      p_start_date: startDate || null,
      p_duration_days: Math.max(Number(durationDays || 1), 1),
      p_split_mode: splitMode,
      p_split_value: Math.max(Number(splitValue || 1), 1),
      p_title: title.trim(),
      p_notes: notes.trim(),
      p_achievement_points: Number(achievementPoints || 0),
      p_reward_points: Number(rewardPoints || 0),
      p_points_mode: pointsMode
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message || "تعذر إنشاء المهمة القرآنية.");
      return;
    }

    const partsCount = Number(result.data?.parts_count || estimatedParts || 1);
    setSuccess(`تم إنشاء مهمة ${mode === "memorization" ? "حفظ" : "تلاوة"} مقسمة إلى ${partsCount} ${partsCount === 1 ? "جزء" : "أجزاء"}. ستظهر للطفل بالتسلسل.`);
    window.setTimeout(() => window.location.reload(), 1300);
  }

  return (
    <section className={embedded ? "" : styles.panel}>
      {!embedded && (
        <div className={styles.head}>
          <div>
            <span>مهمة قرآنية مجزأة</span>
            <h2>تلاوة أو حفظ مقسّم إلى آيات وأجزاء</h2>
            <p>اختر السورة والنطاق وطريقة التقسيم. يصل كل جزء للطفل بآياته مكتوبة، ولا يفتح الجزء التالي حتى يعتمد ولي الأمر الجزء السابق.</p>
          </div>
          <button className={styles.toggle} type="button" onClick={() => setOpen((current) => !current)}>
            {open ? "إغلاق" : "+ إضافة مهمة قرآنية"}
          </button>
        </div>
      )}

      {(embedded || open) && (
        <form className={embedded ? "" : styles.form} onSubmit={submit}>
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

            <label>من الآية
              <input type="number" min="1" max={selectedSurah?.ayah_count || 1} value={fromAyah} onChange={(event) => setFromAyah(event.target.value)} />
            </label>
            <label>إلى الآية
              <input type="number" min="1" max={selectedSurah?.ayah_count || 1} value={toAyah} onChange={(event) => setToAyah(event.target.value)} />
            </label>

            <label>تاريخ البداية
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>مدة التنفيذ بالأيام
              <input type="number" min="1" max="365" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
            </label>

            <label>طريقة التقسيم
              <select value={splitMode} onChange={(event) => setSplitMode(event.target.value as SplitMode)}>
                <option value="single">مهمة واحدة</option>
                <option value="days">تلقائي حسب عدد الأيام</option>
                <option value="parts">عدد محدد من الأجزاء</option>
                <option value="ayahs">عدد آيات في كل جزء</option>
              </select>
            </label>

            {splitMode === "parts" && <label>عدد الأجزاء
              <input type="number" min="1" max={totalAyahs || 1} value={splitValue} onChange={(event) => setSplitValue(event.target.value)} />
            </label>}
            {splitMode === "ayahs" && <label>الآيات في كل جزء
              <input type="number" min="1" max={totalAyahs || 1} value={splitValue} onChange={(event) => setSplitValue(event.target.value)} />
            </label>}

            <label className={styles.full}>عنوان الخطة اختياري
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${mode === "memorization" ? "حفظ" : "تلاوة"} سورة ${selectedSurah?.surah_name_ar || ""}`} />
            </label>
            <label className={styles.full}>تعليمات ولي الأمر
              <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={mode === "memorization" ? "مثال: كرر كل جزء خمس مرات ثم سمّع غيبًا" : "مثال: اقرأ بتأنٍ مع مراعاة أحكام التجويد"} />
            </label>

            <label>طريقة احتساب النقاط
              <select value={pointsMode} onChange={(event) => setPointsMode(event.target.value as "automatic" | "manual")}>
                <option value="automatic">تلقائي حسب سياسة النقاط</option>
                <option value="manual">تحديد يدوي لكل جزء</option>
              </select>
            </label>
            <div className={styles.points}>
              <label>⭐ نقاط الإنجاز لكل جزء<input type="number" min="0" value={achievementPoints} onChange={(event) => setAchievementPoints(event.target.value)} disabled={pointsMode === "automatic"} /></label>
              <label>💎 نقاط المكافآت لكل جزء<input type="number" min="0" value={rewardPoints} onChange={(event) => setRewardPoints(event.target.value)} disabled={pointsMode === "automatic"} /></label>
            </div>
          </div>

          <div className={styles.preview}>
            <strong>المعاينة</strong>
            {mode === "memorization" ? "حفظ" : "تلاوة"} سورة {selectedSurah?.surah_name_ar || "—"} من الآية {fromAyah || "—"} إلى {toAyah || "—"}، في نحو {estimatedParts} {estimatedParts === 1 ? "جزء" : "أجزاء"}. بعد اعتماد جميع الأجزاء يظهر خيار التكريم والإهداء مرتبطًا بالمهمة كاملة.
          </div>

          <button className={styles.submit} type="submit" disabled={saving || !selectedSurah}>{saving ? "جارٍ إنشاء الأجزاء..." : `إسناد مهمة ${mode === "memorization" ? "الحفظ" : "التلاوة"}`}</button>
          <p className={styles.hint}>يُعرض نص الآيات بالرسم المتاح في قاعدة القرآن، ويُفتح كل جزء حسب تاريخه وبعد اعتماد الجزء السابق.</p>
          {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
          {success && <p className={`${styles.message} ${styles.success}`}>{success}</p>}
        </form>
      )}
    </section>
  );
}
