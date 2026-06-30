"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { quranSurahs } from "../../lib/quran-surahs";
import { supabase } from "../../lib/supabase";

type BuilderRole = "parent" | "teacher";
type BuilderMode = "quran" | "religious";

type CatalogItem = {
  id: string;
  slug: string;
  title: string;
  short_title: string;
  author: string | null;
  science_category: string;
  description: string | null;
  age_min: number | null;
  age_max: number | null;
  source_name: string | null;
  source_note: string | null;
  units_count: number;
  chapters_count: number;
  metadata: Record<string, unknown> | null;
};

type Props = {
  studentId: string;
  role: BuilderRole;
  studentName?: string;
  onCreated?: () => void | Promise<void>;
  showQuran?: boolean;
};

function localToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export default function MemorizationPlanBuilder({
  studentId,
  role,
  studentName = "الطفل",
  onCreated,
  showQuran = true
}: Props) {
  const [mode, setMode] = useState<BuilderMode>(showQuran ? "quran" : "religious");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [surahNumber, setSurahNumber] = useState("1");
  const [startDate, setStartDate] = useState(localToday());
  const [durationDays, setDurationDays] = useState("14");
  const [achievementPoints, setAchievementPoints] = useState("10");
  const [rewardPoints, setRewardPoints] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadCatalog() {
      const client = supabase;
      if (!client) return;
      const result = await client.rpc("get_religious_science_catalog");
      if (result.error) {
        setError("تعذر تحميل مكتبة العلوم الدينية.");
        return;
      }
      const items = (result.data || []) as CatalogItem[];
      setCatalog(items);
      setSelectedSlug((current) => current || items[0]?.slug || "");
    }
    loadCatalog();
  }, []);

  const selectedSurah = useMemo(
    () => quranSurahs.find((surah) => surah.number === Number(surahNumber)) || quranSurahs[0],
    [surahNumber]
  );
  const selectedItem = useMemo(
    () => catalog.find((item) => item.slug === selectedSlug) || catalog[0] || null,
    [catalog, selectedSlug]
  );

  const preview = useMemo(() => {
    const duration = Math.max(1, Math.min(365, Number(durationDays || 1)));
    const total = mode === "quran" ? selectedSurah.ayahs : Math.max(1, Number(selectedItem?.units_count || 1));
    const scheduledDays = Math.min(duration, total);
    return {
      total,
      scheduledDays,
      dailyMin: Math.floor(total / scheduledDays),
      dailyMax: Math.ceil(total / scheduledDays),
      dueDate: addDays(startDate, duration - 1)
    };
  }, [durationDays, mode, selectedItem?.units_count, selectedSurah.ayahs, startDate]);

  async function createQuranPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;
    const duration = Number(durationDays);
    if (!startDate || !Number.isInteger(duration) || duration < 1 || duration > 365) {
      setError("تحقق من تاريخ البداية ومدة البرنامج.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    const rpcName = role === "parent" ? "parent_create_quran_scheduled_plan" : "create_quran_scheduled_plan";
    const result = await client.rpc(rpcName, {
      p_student_id: studentId,
      p_title: `برنامج حفظ سورة ${selectedSurah.name}`,
      p_surah_number: selectedSurah.number,
      p_start_date: startDate,
      p_duration_days: duration,
      p_achievement_points: Math.max(0, Number(achievementPoints || 0)),
      p_reward_points: Math.max(0, Number(rewardPoints || 0)),
      p_notes: notes.trim() || null
    });
    setSaving(false);
    if (result.error) {
      setError(result.error.message || "تعذر إنشاء برنامج حفظ القرآن.");
      return;
    }
    setSuccess(`تم إنشاء برنامج سورة ${selectedSurah.name} وتقسيمه تلقائيًا حسب الأيام.`);
    await onCreated?.();
  }

  async function createReligiousPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !selectedItem) return;
    const duration = Number(durationDays);
    if (!startDate || !Number.isInteger(duration) || duration < 1 || duration > 365) {
      setError("تحقق من تاريخ البداية ومدة البرنامج.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    const result = await client.rpc("create_religious_science_plan", {
      p_student_id: studentId,
      p_catalog_slug: selectedItem.slug,
      p_start_date: startDate,
      p_duration_days: duration,
      p_achievement_points: Math.max(0, Number(achievementPoints || 0)),
      p_reward_points: Math.max(0, Number(rewardPoints || 0)),
      p_notes: notes.trim() || null,
      p_create_goal: true
    });
    setSaving(false);
    if (result.error) {
      setError(result.error.message || "تعذر إنشاء برنامج المتن.");
      return;
    }
    setSuccess(`تم إنشاء ${selectedItem.short_title} وربطه بهدف تعليمي وتقسيمه على الأيام.`);
    await onCreated?.();
  }

  return (
    <section className="memorization-plan-builder">
      <div className="memorization-builder-heading">
        <div>
          <span className="section-label">🧭 إنشاء برنامج جديد</span>
          <h2>{role === "parent" ? `خطط حفظ ${studentName}` : "مكتبة العلوم الدينية"}</h2>
          <p>اختر المادة والمدة، وستُنشأ المقاطع اليومية والهدف التعليمي تلقائيًا.</p>
        </div>
        <span className={`builder-role-badge ${role}`}>{role === "parent" ? "ولي الأمر" : "المعلم"}</span>
      </div>

      {showQuran && (
        <div className="memorization-mode-tabs" role="tablist" aria-label="نوع برنامج الحفظ">
          <button type="button" className={mode === "quran" ? "active" : ""} onClick={() => setMode("quran")}><span>📖</span><strong>القرآن الكريم</strong><small>تقسيم سورة حسب الأيام</small></button>
          <button type="button" className={mode === "religious" ? "active" : ""} onClick={() => setMode("religious")}><span>📚</span><strong>العلوم الدينية</strong><small>متون ومنظومات للأطفال</small></button>
        </div>
      )}

      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      {mode === "quran" && showQuran ? (
        <form className="memorization-builder-form" onSubmit={createQuranPlan}>
          <label className="builder-wide-field">السورة
            <select value={surahNumber} onChange={(event) => setSurahNumber(event.target.value)}>
              {quranSurahs.map((surah) => <option key={surah.number} value={surah.number}>{surah.number}. {surah.name} — {surah.ayahs} آية</option>)}
            </select>
          </label>
          <BuilderFields startDate={startDate} setStartDate={setStartDate} durationDays={durationDays} setDurationDays={setDurationDays} achievementPoints={achievementPoints} setAchievementPoints={setAchievementPoints} rewardPoints={rewardPoints} setRewardPoints={setRewardPoints} notes={notes} setNotes={setNotes} />
          <PlanPreview totalLabel={`${preview.total} آية`} preview={preview} />
          <button className="auth-submit builder-create-button" disabled={saving} type="submit">{saving ? "جارٍ إنشاء البرنامج..." : "إنشاء وتقسيم برنامج القرآن"}</button>
        </form>
      ) : (
        <form className="memorization-builder-form" onSubmit={createReligiousPlan}>
          <div className="religious-catalog-grid builder-wide-field">
            {catalog.length === 0 ? <p className="queue-empty-message">لا توجد متون منشورة حاليًا.</p> : catalog.map((item) => (
              <button type="button" key={item.id} className={selectedSlug === item.slug ? "active" : ""} onClick={() => setSelectedSlug(item.slug)}>
                <span>📜</span>
                <div><small>{item.science_category}</small><strong>{item.short_title}</strong><p>{item.description}</p><em>{item.units_count} وحدة · {item.chapters_count} فصل</em></div>
              </button>
            ))}
          </div>
          {selectedItem && <div className="selected-matn-note builder-wide-field"><strong>{selectedItem.title}</strong><span>{selectedItem.author || "مؤلف غير محدد"}</span>{selectedItem.source_note && <p>{selectedItem.source_note}</p>}</div>}
          <BuilderFields startDate={startDate} setStartDate={setStartDate} durationDays={durationDays} setDurationDays={setDurationDays} achievementPoints={achievementPoints} setAchievementPoints={setAchievementPoints} rewardPoints={rewardPoints} setRewardPoints={setRewardPoints} notes={notes} setNotes={setNotes} />
          <PlanPreview totalLabel={`${preview.total} بيت/وحدة`} preview={preview} />
          <button className="auth-submit builder-create-button" disabled={saving || !selectedItem} type="submit">{saving ? "جارٍ إنشاء البرنامج..." : "إنشاء هدف وبرنامج المتن"}</button>
        </form>
      )}
    </section>
  );
}

type BuilderFieldsProps = {
  startDate: string;
  setStartDate: (value: string) => void;
  durationDays: string;
  setDurationDays: (value: string) => void;
  achievementPoints: string;
  setAchievementPoints: (value: string) => void;
  rewardPoints: string;
  setRewardPoints: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
};

function BuilderFields(props: BuilderFieldsProps) {
  return (
    <>
      <label>تاريخ البداية<input type="date" value={props.startDate} onChange={(event) => props.setStartDate(event.target.value)} required /></label>
      <label>مدة البرنامج بالأيام<input type="number" min="1" max="365" value={props.durationDays} onChange={(event) => props.setDurationDays(event.target.value)} required /></label>
      <label>نقاط كل مقطع<input type="number" min="0" max="1000" value={props.achievementPoints} onChange={(event) => props.setAchievementPoints(event.target.value)} /></label>
      <label>مكافأة كل مقطع<input type="number" min="0" max="1000" value={props.rewardPoints} onChange={(event) => props.setRewardPoints(event.target.value)} /></label>
      <label className="builder-wide-field">تعليمات للطفل<textarea value={props.notes} onChange={(event) => props.setNotes(event.target.value)} placeholder="مثال: كرر المقطع ثلاث مرات ثم سجّل التسميع." /></label>
    </>
  );
}

function PlanPreview({ totalLabel, preview }: { totalLabel: string; preview: { scheduledDays: number; dailyMin: number; dailyMax: number; dueDate: string } }) {
  return (
    <div className="memorization-plan-preview builder-wide-field">
      <article><span>المحتوى</span><strong>{totalLabel}</strong></article>
      <article><span>أيام الحفظ</span><strong>{preview.scheduledDays}</strong></article>
      <article><span>الورد اليومي</span><strong>{preview.dailyMin === preview.dailyMax ? preview.dailyMin : `${preview.dailyMin}–${preview.dailyMax}`}</strong></article>
      <article><span>نهاية البرنامج</span><strong>{formatDate(preview.dueDate)}</strong></article>
    </div>
  );
}
