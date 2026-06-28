import { CatalogGift } from "./giftTypes";
import styles from "./GiftCenter.module.css";

export default function GiftCatalog({ gifts, selectedCode, balance, includedRemaining, onSelect, onPreview }: {
  gifts: CatalogGift[];
  selectedCode: string;
  balance: number;
  includedRemaining: number;
  onSelect: (code: string) => void;
  onPreview: (gift: CatalogGift) => void;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div><span className={styles.label}>الكتالوج</span><h2>اختر الهدية</h2><p>الهدايا الخضراء ضمن الاشتراك، والذهبية تُشترى من رصيد الكوينز. عاين التجربة كاملة قبل الاختيار.</p></div>
      </div>
      <div className={styles.catalog}>
        {gifts.map((gift) => {
          const unavailable = gift.tier === "included" ? includedRemaining < 1 : balance < gift.coin_price;
          const selected = selectedCode === gift.code;
          return (
            <article
              key={gift.id}
              className={`${styles.gift} ${selected ? styles.selected : ""} ${unavailable ? styles.locked : ""}`}
            >
              <button
                type="button"
                className={styles.giftSelect}
                onClick={() => onSelect(gift.code)}
                aria-pressed={selected}
              >
                <span className={styles.icon}>{gift.icon}</span>
                <h3>{gift.name}</h3>
                <p>{gift.description}</p>
                <span className={`${styles.price} ${gift.tier === "premium" ? styles.premium : ""}`}>
                  {gift.tier === "included" ? "مشمولة شهريًا" : `${gift.coin_price} كوينز · ${gift.sar_price} ر.س`}
                </span>
              </button>
              <button
                type="button"
                className={styles.previewButton}
                onClick={() => {
                  onSelect(gift.code);
                  onPreview(gift);
                }}
              >
                <span>▶</span> معاينة الهدية
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
