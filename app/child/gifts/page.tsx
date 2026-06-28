"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import GiftCelebrationModal from "../../components/GiftCelebrationModal";
import ChildCertificate from "./ChildCertificate";
import GiftCard from "./GiftCard";
import { ChildGift, GiftData } from "./types";
import styles from "./ChildGifts.module.css";

export default function ChildGiftsPage() {
  const router = useRouter();
  const autoOpened = useRef(false);
  const [data, setData] = useState<GiftData | null>(null);
  const [selected, setSelected] = useState<ChildGift | null>(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);

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

  function printGift(gift: ChildGift) {
    setSelected(gift);
    setPrinting(true);
    window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 180);
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

      {selected && !printing && (
        <GiftCelebrationModal
          gift={selected.gift}
          childName={data.student.full_name}
          achievement={selected.achievement_title}
          reason={selected.reason}
          mode="delivery"
          senderName={selected.sender_name}
          certificateNumber={selected.certificate_number}
          giftedAt={selected.gifted_at}
          priceLabel="هدية إنجاز"
          onPrintCertificate={() => printGift(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
