"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import ChildCertificate from "./ChildCertificate";
import GiftCard from "./GiftCard";
import { ChildGift, GiftData } from "./types";
import styles from "./ChildGifts.module.css";

export default function ChildGiftsPage() {
  const router = useRouter();
  const autoOpened = useRef(false);
  const [data, setData] = useState<GiftData | null>(null);
  const [selected, setSelected] = useState<ChildGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const token = localStorage.getItem("namaa_child_token");
      if (!token) { router.replace("/child/login"); return; }
      const result = await supabase.rpc("get_child_gifts", { p_session_token: token });
      if (result.error || !result.data) {
        localStorage.removeItem("namaa_child_token");
        router.replace("/child/login");
        return;
      }
      const next = result.data as GiftData;
      setData(next);
      setLoading(false);
      const fresh = next.gifts.find((gift) => gift.status === "delivered");
      if (fresh && !autoOpened.current) { autoOpened.current = true; void openGift(fresh); }
    }
    void load();
  }, [router]);

  async function openGift(gift: ChildGift) {
    setSelected(gift);
    if (!supabase || gift.status === "opened") return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;
    const result = await supabase.rpc("child_open_gift", { p_session_token: token, p_gift_id: gift.id });
    if (!result.error) {
      setData((current) => current ? {
        ...current,
        gifts: current.gifts.map((item) => item.id === gift.id ? { ...item, status: "opened", opened_at: result.data?.opened_at || new Date().toISOString() } : item)
      } : current);
    }
  }

  function playSound() {
    if (!("speechSynthesis" in window)) { setError("الصوت غير مدعوم على هذا الجهاز."); return; }
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(`أحسنت يا ${data?.student.full_name || "بطل"}`);
    message.lang = "ar-SA";
    message.rate = .85;
    window.speechSynthesis.speak(message);
  }

  function printGift(gift: ChildGift) {
    setSelected(gift);
    window.setTimeout(() => window.print(), 150);
  }

  if (loading || !data) return <main className={styles.page}><div className={styles.content}>جارٍ فتح خزانة الهدايا...</div></main>;
  const unopened = data.gifts.filter((gift) => gift.status === "delivered");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span>خزانة إنجازاتي</span><h1>هدايا {data.student.full_name} 🎁</h1></div>
        <Link href="/child">العودة إلى حسابي</Link>
      </header>

      <div className={styles.content}>
        {unopened.length > 0 && (
          <section className={styles.banner}>
            <div><h2>لديك {unopened.length} {unopened.length === 1 ? "هدية جديدة" : "هدايا جديدة"}!</h2><p>افتحها وشاهد الاحتفال الذي أعده لك ولي أمرك.</p></div>
            <button type="button" onClick={() => void openGift(unopened[0])}>فتح الهدية 🎉</button>
          </section>
        )}
        <p className={styles.info}>هذه الهدايا ذكرى رقمية لإنجازاتك، ويمكنك مشاهدتها وطباعتها، لكنها لا تُباع ولا تُحوّل إلى أموال.</p>
        {error && <p className={styles.message}>{error}</p>}

        <section className={styles.cabinet}>
          <div className={styles.cabinetHead}><div><h2>خزانة إنجازاتي</h2><p>كل هدية تحكي قصة هدف أو مهمة أنجزتها.</p></div><strong>{data.gifts.length} هدية</strong></div>
          {data.gifts.length === 0 ? (
            <div className={styles.empty}><span>🌟</span><strong>خزانتك تنتظر أول إنجاز</strong><p>أكمل أهدافك ومهامك، وقد يصلك تكريم جميل.</p></div>
          ) : (
            <div className={styles.grid}>{data.gifts.map((gift) => <GiftCard key={gift.id} gift={gift} onOpen={openGift} onPrint={printGift} />)}</div>
          )}
        </section>

        {selected && <ChildCertificate gift={selected} studentName={data.student.full_name} />}
      </div>

      {selected && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <section className={styles.celebration}>
            <div className={styles.sparkles}>✦ ★ ✧ ✦ ★ ✧ ✦ ★ ✧ ✦ ★ ✧</div>
            <span className={`${styles.celebrationIcon} ${styles[selected.gift.animation_key] || ""}`}>{selected.gift.icon}</span>
            <h2>مبارك يا {data.student.full_name}! 🎉</h2>
            <h3>{selected.gift.name}</h3>
            <p>لإنجازك: <strong>{selected.achievement_title}</strong></p>
            {selected.reason && <p>{selected.reason}</p>}
            <p>بكل فخر ومحبة من {selected.sender_name}</p>
            <div className={styles.celebrationActions}>
              <button type="button" onClick={playSound}>🔊 تشغيل الصوت</button>
              <button type="button" onClick={() => printGift(selected)}>طباعة الشهادة</button>
              <button type="button" onClick={() => setSelected(null)}>إغلاق</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
