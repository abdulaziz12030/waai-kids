import { ChildGift, formatGiftDate } from "./types";
import styles from "./ChildGifts.module.css";

export default function GiftCard({ gift }: { gift: ChildGift }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.icon}>{gift.gift.icon}</span>
        <div><h3>{gift.gift.name}</h3><small>{formatGiftDate(gift.gifted_at)}</small></div>
      </div>
      <p><strong>{gift.achievement_title}</strong></p>
      <p>{gift.reason || gift.gift.description}</p>
    </article>
  );
}
