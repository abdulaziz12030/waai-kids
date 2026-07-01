import type { RefObject } from "react";
import type { PreviewGiftLike } from "./giftPreviewConfig";
import styles from "./ArabianHorseScene.module.css";
import deliveryStyles from "./ArabianHorseDelivery.module.css";
import startStyles from "./ArabianHorseStart.module.css";
import timingStyles from "./ArabianHorseExclusiveTiming.module.css";

type ArabianHorseSceneProps = {
  gift: PreviewGiftLike;
  childName: string;
  achievement: string;
  reason?: string | null;
  senderName?: string;
  status: "idle" | "playing" | "finished";
  mode: "preview" | "delivery";
  videoUrl: string;
  muted: boolean;
  runId: number;
  loading?: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  startButtonRef?: RefObject<HTMLButtonElement | null>;
  onStart: () => void;
  onEnded: () => void;
};

export default function ArabianHorseScene({
  gift,
  childName,
  achievement,
  reason,
  senderName,
  status,
  mode,
  videoUrl,
  muted,
  runId,
  loading = false,
  videoRef,
  startButtonRef,
  onStart,
  onEnded
}: ArabianHorseSceneProps) {
  const active = status !== "idle";

  return (
    <div className={`${styles.scene} ${mode === "delivery" ? deliveryStyles.delivery : ""} ${active ? `${styles.active} ${timingStyles.active}` : ""} ${status === "finished" ? styles.finished : ""}`}>
      <div className={styles.videoBackdrop} aria-hidden="true" />
      <div className={styles.videoFrame}>
        <video
          ref={videoRef}
          className={styles.video}
          src={videoUrl}
          poster="/gifts/arabian-horse/opening.webp"
          preload="auto"
          playsInline
          muted={muted}
          disablePictureInPicture
          onEnded={onEnded}
          aria-label="فيديو هدية الخيل العربي"
        />
      </div>
      <div className={styles.videoShade} aria-hidden="true" />

      {active && (
        <div key={runId} className={styles.overlayTimeline} aria-live="polite">
          <div className={styles.greeting}>
            <span>أحسنت يا</span>
            <strong>{childName}</strong>
          </div>

          <div className={`${styles.finalCopy} ${timingStyles.finalCopyTiming}`}>
            <span className={styles.giftMark}>{gift.icon}</span>
            <p>أُهديت لك</p>
            <h2>هدية الخيل العربي</h2>
            <h3>بمناسبة {achievement}</h3>
            {reason && <small>{reason}</small>}
            {senderName && <em>بكل فخر ومحبة من {senderName}</em>}
          </div>
        </div>
      )}

      <div className={styles.brand}>
        <span>و</span>
        <div><strong>واعي كيدز</strong><small>WAAI KIDS · ينمو بوعي ويُنجز بثقة</small></div>
      </div>

      {status === "idle" && (
        <div className={startStyles.startGate}>
          <div className={startStyles.startEmblem} aria-hidden="true">♞</div>
          <span className={startStyles.startKicker}>{mode === "preview" ? "معاينة فيديو تفاعلية" : "هدية إنجاز فاخرة"}</span>
          <h1>الخيل العربي</h1>
          <p>مشهد الخيل العربي في الصحراء بصوته الأصلي، ضمن تجربة هدية كاملة من واعي كيدز.</p>
          <button ref={startButtonRef} type="button" onClick={onStart} disabled={loading}>
            <span>▶</span>{loading ? "جارٍ تجهيز الفيديو..." : "تشغيل هدية الخيل بالصوت"}
          </button>
        </div>
      )}
    </div>
  );
}
