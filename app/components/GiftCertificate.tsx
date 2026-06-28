import { RecentGift, formatGiftDate } from "./giftTypes";
import styles from "./GiftCenter.module.css";

export default function GiftCertificate({ gift, studentName }: { gift: RecentGift; studentName: string }) {
  return (
    <article className={styles.certificate}>
      <strong className={styles.brand}>نـمـاء</strong>
      <span className={styles.certIcon}>{gift.gift.icon}</span>
      <h2>{gift.gift.certificate_title || "شهادة شكر وتقدير"}</h2>
      <p>تُقدَّم بكل فخر وتقدير إلى</p>
      <h3>{studentName}</h3>
      <p>تقديرًا لإنجازه المميز: <strong>{gift.achievement_title}</strong></p>
      {gift.reason && <p>{gift.reason}</p>}
      <p>الهدية: <strong>{gift.gift.name}</strong></p>
      <div className={styles.meta}>
        <span>رقم الشهادة: {gift.certificate_number}</span>
        <span>التاريخ: {formatGiftDate(gift.gifted_at)}</span>
      </div>
    </article>
  );
}
