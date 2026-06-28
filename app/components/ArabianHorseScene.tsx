import type { RefObject } from "react";
import type { PreviewGiftLike } from "./giftPreviewConfig";
import { ARABIAN_HORSE_IMAGE } from "./arabianHorseAssets";
import styles from "./ArabianHorseScene.module.css";
import startStyles from "./ArabianHorseStart.module.css";

type ArabianHorseSceneProps = {
  gift: PreviewGiftLike;
  childName: string;
  achievement: string;
  reason?: string | null;
  senderName?: string;
  status: "idle" | "playing" | "finished";
  mode: "preview" | "delivery";
  loading?: boolean;
  startButtonRef?: RefObject<HTMLButtonElement | null>;
  onStart: () => void;
};

export default function ArabianHorseScene({
  gift,
  childName,
  achievement,
  reason,
  senderName,
  status,
  mode,
  loading = false,
  startButtonRef,
  onStart
}: ArabianHorseSceneProps) {
  const active = status !== "idle";

  return (
    <div className={`${styles.scene} ${active ? styles.active : ""} ${status === "finished" ? styles.finished : ""}`}>
      <div className={styles.blackBase} />
      <div className={styles.revealGlow} />

      <div className={styles.photoStage} aria-hidden="true">
        <div className={styles.photoBlur} style={{ backgroundImage: `url(${ARABIAN_HORSE_IMAGE})` }} />
        <div className={styles.photo} style={{ backgroundImage: `url(${ARABIAN_HORSE_IMAGE})` }} />
        <div className={styles.photoHighlight} style={{ backgroundImage: `url(${ARABIAN_HORSE_IMAGE})` }} />
      </div>

      <div className={styles.shadowCurtain} aria-hidden="true"><span /><span /></div>
      <div className={styles.speedStreaks} aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <span key={index} />)}
      </div>
      <div className={styles.dust} aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
      </div>
      <div className={styles.hoofSparks} aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => <span key={index} />)}
      </div>
      <div className={styles.jumpRing} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.impactFlash} aria-hidden="true" />

      <div className={styles.greeting}>
        <span>أحسنت يا</span>
        <strong>{childName}</strong>
      </div>

      <div className={styles.finalCopy}>
        <span className={styles.giftMark}>{gift.icon}</span>
        <p>أُهديت لك</p>
        <h2>هدية الخيل العربي</h2>
        <h3>بمناسبة {achievement}</h3>
        {reason && <small>{reason}</small>}
        {senderName && <em>بكل فخر ومحبة من {senderName}</em>}
      </div>

      <div className={styles.brand}>
        <span>و</span>
        <div><strong>واعي كيدز</strong><small>WAAI KIDS · ينمو بوعي ويُنجز بثقة</small></div>
      </div>

      {status === "idle" && (
        <div className={startStyles.startGate}>
          <div className={startStyles.startEmblem} aria-hidden="true">♞</div>
          <span className={startStyles.startKicker}>{mode === "preview" ? "معاينة تفاعلية كاملة" : "هدية إنجاز جديدة"}</span>
          <h1>الخيل العربي</h1>
          <p>المس لبدء مشهد الخيل الأدهم بصوت الحوافر والصهيل والقفزة.</p>
          <button ref={startButtonRef} type="button" onClick={onStart} disabled={loading}>
            <span>▶</span>{loading ? "جارٍ تجهيز الصوت..." : "بدء العرض بالصوت"}
          </button>
        </div>
      )}
    </div>
  );
}
