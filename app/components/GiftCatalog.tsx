import { CatalogGift } from "./giftTypes";
import styles from "./GiftCenter.module.css";

export default function GiftCatalog({ gifts, selectedCode, balance, includedRemaining, onSelect }: {
  gifts: CatalogGift[];
  selectedCode: string;
  balance: number;
  includedRemaining: number;
  onSelect: (code: string) => void;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div><span className={styles.label}>الكتالوج</span><h2>اختر الهدية</h2><p>الهدايا الخضراء ضمن الاشتراك، والذهبية تُشترى من رصيد الكوينز.</p></div>
      </div>
      <div className={styles.catalog}>
        {gifts.map((gift) => {
          const unavailable = gift.tier === "included" ? includedRemaining < 1 : balance < gift.coin_price;
          return (
            <button
              type="button"
              key={gift.id}
              onClick={() => onSelect(gift.code)}
              className={`${styles.gift} ${selectedCode === gift.code ? styles.selected : ""} ${unavailable ? styles.locked : ""}`}
            >
              <span className={styles.icon}>{gift.icon}</span>
              <h3>{gift.name}</h3>
              <p>{gift.description}</p>
              <span className={`${styles.price} ${gift.tier === "premium" ? styles.premium : ""}`}>
                {gift.tier === "included" ? "مشمولة شهريًا" : `${gift.coin_price} كوينز · ${gift.sar_price} ر.س`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
