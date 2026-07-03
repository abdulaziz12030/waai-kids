import { ChildGift, formatGiftDate } from "./types";
import styles from "./ChildGifts.module.css";

export default function GiftCard({ gift, onOpen, onPrint }: {
  gift: ChildGift;
  onOpen: (gift: ChildGift) => void;
  onPrint: (gift: ChildGift) => void;
}) {
  function open() { onOpen(gift); }
  function print() { onPrint(gift); }

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.icon}>{gift.gift.icon}</span>
        <div>
          <h3>{gift.gift.name}{gift.status === "delivered" && <span className={styles.badge}>جديدة</span>}</h3>
          <small>{formatGiftDate(gift.gifted_at)}</small>
        </div>
      </div>
      <div className={styles.giftDetails}>
        <div>
          <span>الإنجاز</span>
          <strong>{gift.achievement_title || "تكريم مميز"}</strong>
        </div>
        <div>
          <span>سبب الهدية</span>
          <p>{gift.reason || gift.gift.description || "تقديرًا لجهدك وإنجازك"}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={open}>مشاهدة الهدية</button>
        <button type="button" onClick={print}>طباعة الشهادة</button>
      </div>
    </article>
  );
}
