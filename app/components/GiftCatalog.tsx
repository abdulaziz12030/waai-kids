import { CatalogGift } from "./giftTypes";
import { ARABIAN_HORSE_IMAGE } from "./arabianHorseAssets";
import styles from "./GiftCenter.module.css";

function isArabianHorse(gift: CatalogGift) {
  return gift.animation_key === "arabian_horse" || /خيل|حصان|horse/i.test(`${gift.code} ${gift.name}`);
}

export default function GiftCatalog({ gifts, selectedCode, balance, includedRemaining, trialMode = false, onSelect, onPreview }: {
  gifts: CatalogGift[];
  selectedCode: string;
  balance: number;
  includedRemaining: number;
  trialMode?: boolean;
  onSelect: (code: string) => void;
  onPreview: (gift: CatalogGift) => void;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div>
          <span className={styles.label}>الكتالوج</span>
          <h2>اختر الهدية</h2>
          <p>{trialMode ? "جميع الهدايا متاحة مجانًا خلال النسخة التجريبية. عاين التجربة كاملة ثم اختر الهدية المناسبة." : "الهدايا الخضراء ضمن الاشتراك، والذهبية تُشترى من رصيد الكوينز. عاين التجربة كاملة قبل الاختيار."}</p>
        </div>
      </div>
      <div className={styles.catalog}>
        {gifts.map((gift) => {
          const unavailable = !trialMode && (gift.tier === "included" ? includedRemaining < 1 : balance < gift.coin_price);
          const selected = selectedCode === gift.code;
          const horseGift = isArabianHorse(gift);
          const chooseGift = () => {
            onSelect(gift.code);
            if (horseGift) onPreview(gift);
          };

          return (
            <article
              key={gift.id}
              className={`${styles.gift} ${selected ? styles.selected : ""} ${unavailable ? styles.locked : ""} ${horseGift ? styles.horseGift : ""}`}
            >
              <button
                type="button"
                className={styles.giftSelect}
                onClick={chooseGift}
                aria-pressed={selected}
                aria-label={horseGift ? "اختيار ومعاينة هدية الخيل العربي" : `اختيار ${gift.name}`}
              >
                {horseGift ? (
                  <span className={styles.horseCardVisual} style={{ backgroundImage: `url(${ARABIAN_HORSE_IMAGE})` }}>
                    <span className={styles.horseCardShade} />
                    <span className={styles.horseLuxuryBadge}>{trialMode ? "مجانية تجريبيًا" : "هدية فاخرة"}</span>
                    <span className={styles.horseCardTitle}>الخيل العربي</span>
                    <span className={styles.horseCardHint}>اضغط لبدء المشهد بالصوت</span>
                  </span>
                ) : (
                  <span className={styles.icon}>{gift.icon}</span>
                )}
                {!horseGift && <h3>{gift.name}</h3>}
                <p>{gift.description}</p>
                <span className={`${styles.price} ${gift.tier === "premium" ? styles.premium : ""}`}>
                  {trialMode ? "مجانًا في النسخة التجريبية" : gift.tier === "included" ? "مشمولة شهريًا" : `${gift.coin_price} كوينز · ${gift.sar_price} ر.س`}
                </span>
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${horseGift ? styles.horsePreviewButton : ""}`}
                onClick={() => {
                  onSelect(gift.code);
                  onPreview(gift);
                }}
              >
                <span>▶</span> {horseGift ? "تشغيل مشهد الخيل" : "معاينة الهدية"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
