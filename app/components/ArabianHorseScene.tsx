import type { PreviewGiftLike } from "./giftPreviewConfig";
import styles from "./ArabianHorseScene.module.css";

type ArabianHorseSceneProps = {
  gift: PreviewGiftLike;
  childName: string;
  achievement: string;
  reason?: string | null;
  senderName?: string;
  status: "idle" | "playing" | "finished";
};

const HORSE_SCENE_IMAGE = "https://images.unsplash.com/photo-1757496798794-4b19ef24951c?auto=format&fit=crop&fm=jpg&q=88&w=1800";

export default function ArabianHorseScene({
  gift,
  childName,
  achievement,
  reason,
  senderName,
  status
}: ArabianHorseSceneProps) {
  const active = status !== "idle";

  return (
    <div className={`${styles.scene} ${active ? styles.active : ""} ${status === "finished" ? styles.finished : ""}`}>
      <div className={styles.blackBase} />
      <div className={styles.revealGlow} />

      <div className={styles.photoStage} aria-hidden="true">
        <div className={styles.photoBlur} style={{ backgroundImage: `url(${HORSE_SCENE_IMAGE})` }} />
        <div className={styles.photo} style={{ backgroundImage: `url(${HORSE_SCENE_IMAGE})` }} />
        <div className={styles.photoHighlight} style={{ backgroundImage: `url(${HORSE_SCENE_IMAGE})` }} />
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
    </div>
  );
}
