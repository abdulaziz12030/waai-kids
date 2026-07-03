"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import GiftCatalog from "./GiftCatalog";
import GiftCertificate from "./GiftCertificate";
import GiftCelebrationModal from "./GiftCelebrationModal";
import { CatalogGift, GiftCenterData, RecentGift, formatGiftDate, giftError } from "./giftTypes";
import styles from "./GiftCenter.module.css";

const TRIAL_GIFTS_FREE = true;

export default function GiftCenter({ studentId }: { studentId: string }) {
  const [requestedTaskId, setRequestedTaskId] = useState("");
  const [data, setData] = useState<GiftCenterData | null>(null);
  const [giftCode, setGiftCode] = useState("");
  const [achievement, setAchievement] = useState("custom");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [printable, setPrintable] = useState<RecentGift | null>(null);
  const [previewGift, setPreviewGift] = useState<CatalogGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setRequestedTaskId(new URLSearchParams(window.location.search).get("task") || "");
  }, []);

  async function loadCenter() {
    if (!supabase) return null;
    const result = await supabase.rpc("get_family_gift_center", { p_student_id: studentId });
    if (result.error || !result.data) {
      setError(result.error?.message || "تعذر تحميل مركز الهدايا.");
      setLoading(false);
      return null;
    }
    const next = result.data as GiftCenterData;
    setData(next);
    setGiftCode((current) => current || next.catalog[0]?.code || "");
    setLoading(false);
    return next;
  }

  useEffect(() => { void loadCenter(); }, [studentId]);

  useEffect(() => {
    if (!data || !requestedTaskId) return;
    const task = data.tasks.find((item) => item.id === requestedTaskId);
    if (!task) return;

    setAchievement(`task:${task.id}`);
    setReason((current) => current || `أحسنت إتمام مهمة «${task.title}». هذا التكريم تقديرًا لاجتهادك والتزامك.`);
    window.setTimeout(() => {
      document.getElementById("gift-award-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [data, requestedTaskId]);

  const gift = useMemo(() => data?.catalog.find((item) => item.code === giftCode) || null, [data, giftCode]);
  const details = useMemo(() => {
    if (!data) return { type: "custom", title: title.trim(), goalId: null, taskId: null };
    if (achievement.startsWith("goal:")) {
      const item = data.goals.find((goal) => goal.id === achievement.slice(5));
      return { type: "goal", title: item ? `إكمال الهدف: ${item.title}` : "", goalId: item?.id || null, taskId: null };
    }
    if (achievement.startsWith("task:")) {
      const item = data.tasks.find((task) => task.id === achievement.slice(5));
      return { type: "task", title: item ? `إتمام المهمة: ${item.title}` : "", goalId: null, taskId: item?.id || null };
    }
    return { type: achievement === "quran" ? "quran" : "custom", title: title.trim(), goalId: null, taskId: null };
  }, [achievement, data, title]);

  const noIncluded = !TRIAL_GIFTS_FREE && gift?.tier === "included" && Number(data?.wallet.included_remaining || 0) < 1;
  const noCoins = !TRIAL_GIFTS_FREE && gift?.tier === "premium" && Number(data?.wallet.coin_balance || 0) < Number(gift.coin_price || 0);
  const canSend = Boolean(gift && details.title.length >= 3 && !noIncluded && !noCoins && !sending);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !data || !gift || !canSend) return;
    setSending(true); setError(""); setSuccess("");
    const result = await supabase.rpc("send_child_gift", {
      p_student_id: studentId,
      p_gift_code: gift.code,
      p_achievement_title: details.title,
      p_reason: reason.trim() || null,
      p_goal_id: details.goalId,
      p_task_id: details.taskId,
      p_achievement_type: details.type
    });
    if (result.error) {
      setError(giftError(result.error.message));
      setSending(false);
      return;
    }
    const refreshed = await loadCenter();
    const sent = refreshed?.recent_gifts.find((item) => item.id === result.data?.id) || refreshed?.recent_gifts[0];
    if (sent) setPrintable(sent);
    setReason("");
    setSuccess(`تم إرسال ${gift.name} إلى ${data.student.full_name} مجانًا وإضافتها إلى خزانة إنجازاته.`);
    setSending(false);
  }

  function printGift(item: RecentGift) {
    setPrintable(item);
    window.setTimeout(() => window.print(), 150);
  }

  function choosePreviewGift(item: CatalogGift) {
    setGiftCode(item.code);
    setPreviewGift(null);
    window.setTimeout(() => document.getElementById("gift-award-details")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  if (loading) return <main className={styles.page}>جارٍ تجهيز مركز الهدايا...</main>;
  if (!data) return <main className={styles.page}><p className={`${styles.message} ${styles.error}`}>{error}</p></main>;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div><span className={styles.label}>مركز الهدايا والتحفيز</span><h1>كرّم {data.student.full_name} على كل خطوة جميلة</h1><p>اختر هدية واربطها بهدف مكتمل أو مهمة معتمدة. ستظهر للطفل باحتفال كامل وتبقى في خزانة إنجازاته.</p></div>
        <div className={styles.wallets}>
          {TRIAL_GIFTS_FREE ? (
            <>
              <article className={styles.wallet}><span>🎁</span><strong>مجانية</strong><small>جميع الهدايا في النسخة التجريبية</small></article>
              <article className={styles.wallet}><span>∞</span><strong>غير محدودة</strong><small>لا يُخصم رصيد أو كوينز حاليًا</small></article>
            </>
          ) : (
            <>
              <article className={styles.wallet}><span>🪙</span><strong>{data.wallet.coin_balance}</strong><small>كوينز متاحة</small></article>
              <article className={styles.wallet}><span>🎁</span><strong>{data.wallet.included_remaining}</strong><small>من {data.wallet.included_monthly_limit} هدايا مشمولة</small></article>
            </>
          )}
        </div>
      </section>

      <p className={styles.notice}>{TRIAL_GIFTS_FREE ? "النسخة الحالية تجريبية: يمكنك إرسال جميع الهدايا مجانًا دون خصم كوينز أو احتساب حد شهري." : "الهدايا رقمية تشجيعية لا تُباع ولا تُستبدل بأموال، ونقاط الطفل مستقلة تمامًا عن كوينز ولي الأمر."}</p>

      <GiftCatalog gifts={data.catalog} selectedCode={giftCode} balance={data.wallet.coin_balance} includedRemaining={data.wallet.included_remaining} trialMode={TRIAL_GIFTS_FREE} onSelect={setGiftCode} onPreview={setPreviewGift} />

      <section className={styles.section} id="gift-award-details">
        <div className={styles.head}><div><span className={styles.label}>تفاصيل التكريم</span><h2>اربط الهدية بالإنجاز</h2></div></div>
        <div className={styles.formGrid}>
          <form className={styles.form} onSubmit={submit}>
            <label>الإنجاز<select value={achievement} onChange={(event) => setAchievement(event.target.value)}><option value="custom">إنجاز مخصص</option><option value="quran">إنجاز في حفظ القرآن</option>{data.goals.map((item) => <option key={item.id} value={`goal:${item.id}`}>هدف مكتمل: {item.title}</option>)}{data.tasks.map((item) => <option key={item.id} value={`task:${item.id}`}>مهمة معتمدة: {item.title}</option>)}</select></label>
            {(achievement === "custom" || achievement === "quran") && <label>اسم الإنجاز<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={achievement === "quran" ? "مثال: إتقان حفظ سورة الملك" : "مثال: الالتزام بالصلاة لمدة أسبوع"} required /></label>}
            <label>سبب الهدية وخطاب التقدير<textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="تقديرًا لاجتهادك وصبرك وإكمالك المهمة" /></label>
            <button className={styles.button} type="submit" disabled={!canSend}>{sending ? "جارٍ الإرسال..." : TRIAL_GIFTS_FREE ? "إرسال الهدية مجانًا" : noIncluded ? "انتهت الهدايا المشمولة" : noCoins ? `تحتاج ${gift?.coin_price || 0} كوينز` : "إرسال الهدية الآن"}</button>
            {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}{success && <p className={styles.message}>{success}</p>}
          </form>
          <article className={styles.preview}><div><span className={styles.previewIcon}>{gift?.icon || "🎁"}</span><h3>{gift?.name || "اختر هدية"}</h3><p>{details.title || "اختر الإنجاز واكتب عنوانه"}</p><p>{reason || "سيظهر سبب التكريم في شاشة الطفل والشهادة."}</p></div></article>
        </div>
      </section>

      {!TRIAL_GIFTS_FREE && <section className={styles.section}><div className={styles.head}><div><span className={styles.label}>شحن الكوينز</span><h2>الباقات المقترحة</h2><p>تم تجهيز الباقات، ويُفعّل الدفع عند ربط بوابة الدفع المعتمدة.</p></div></div><div className={styles.packages}>{data.coin_packages.map((item) => <article className={styles.package} key={item.id}><span>🪙</span><h3>{item.name}</h3><strong>{item.coins + item.bonus_coins} كوينز</strong><p>{item.price_sar} ر.س {item.bonus_coins > 0 ? `· ${item.bonus_coins} إضافية` : ""}</p><button type="button" disabled>الدفع قريبًا</button></article>)}</div></section>}

      <section className={styles.section}>
        <div className={styles.head}><div><span className={styles.label}>السجل</span><h2>الهدايا المرسلة</h2></div></div>
        {data.recent_gifts.length === 0 ? <div className={styles.empty}>لم تُرسل أي هدية بعد.</div> : <div className={styles.recent}>{data.recent_gifts.map((item) => <article className={styles.card} key={item.id}><div className={styles.cardTop}><span>{item.gift.icon}</span><div><h3>{item.gift.name}</h3><small>{formatGiftDate(item.gifted_at)}</small></div></div><p>{item.achievement_title}</p><div className={styles.actions}><button type="button" onClick={() => setPrintable(item)}>عرض الشهادة</button><button type="button" onClick={() => printGift(item)}>طباعة</button></div></article>)}</div>}
      </section>

      {printable && <GiftCertificate gift={printable} studentName={data.student.full_name} />}

      {previewGift && <GiftCelebrationModal gift={previewGift} childName="عمر" achievement="إتمام حفظ سورة الملك" reason="تقديرًا لاجتهاده وإتقانه الحفظ" mode="preview" priceLabel={TRIAL_GIFTS_FREE ? "مجانية في النسخة التجريبية" : previewGift.tier === "included" ? "ضمن الاشتراك" : `${previewGift.coin_price} كوينز`} primaryActionLabel={TRIAL_GIFTS_FREE ? "اختيارها للإهداء مجانًا" : previewGift.tier === "included" ? "اختيارها للإهداء" : "اختيارها للشراء بالكوينز"} onPrimaryAction={() => choosePreviewGift(previewGift)} onClose={() => setPreviewGift(null)} />}
    </main>
  );
}
