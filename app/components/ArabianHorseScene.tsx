"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PreviewGiftLike } from "./giftPreviewConfig";
import { ARABIAN_HORSE_IMAGE } from "./arabianHorseAssets";
import styles from "./ArabianHorseScene.module.css";
import startStyles from "./ArabianHorseStart.module.css";
import videoStyles from "./ArabianHorseVideo.module.css";

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

const HORSE_VIDEO_SOURCES = [
  "https://videos.pexels.com/video-files/8624837/8624837-hd_1920_1080_30fps.mp4",
  "https://www.pexels.com/download/video/8624837/",
  "https://www.pexels.com/download/video/8625404/"
];

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoBuffering, setVideoBuffering] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (status === "playing") {
      setVideoBuffering(video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
      video.currentTime = 0;
      video.playbackRate = 0.92;
      void video.play().then(() => {
        setVideoBuffering(false);
        setVideoFailed(false);
      }).catch(() => {
        setVideoBuffering(false);
        setVideoFailed(true);
      });
    }

    if (status === "finished") video.pause();
    if (status === "idle") {
      video.pause();
      video.currentTime = 0;
    }
  }, [status]);

  return (
    <div className={`${styles.scene} ${active ? `${styles.active} ${videoStyles.active}` : ""} ${status === "finished" ? styles.finished : ""}`}>
      <div className={styles.blackBase} />
      <div className={styles.revealGlow} />

      <div
        className={videoStyles.fallbackPoster}
        aria-hidden="true"
        style={{ backgroundImage: `url(${ARABIAN_HORSE_IMAGE})` }}
      />

      {!videoFailed && (
        <div className={videoStyles.videoStage} aria-hidden="true">
          <video
            ref={videoRef}
            className={videoStyles.video}
            muted
            playsInline
            preload="auto"
            poster={ARABIAN_HORSE_IMAGE}
            disablePictureInPicture
            controls={false}
            onCanPlay={() => setVideoBuffering(false)}
            onPlaying={() => {
              setVideoBuffering(false);
              setVideoFailed(false);
            }}
            onWaiting={() => setVideoBuffering(true)}
            onStalled={() => setVideoBuffering(true)}
            onError={() => {
              setVideoFailed(true);
              setVideoBuffering(false);
            }}
          >
            {HORSE_VIDEO_SOURCES.map((source) => <source key={source} src={source} type="video/mp4" />)}
          </video>
          <div className={videoStyles.videoVeil} />
          <div className={videoStyles.videoGold} />
          <div className={videoStyles.videoVignette} />
          <div className={videoStyles.videoGrain} />
        </div>
      )}

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

      {active && videoBuffering && !videoFailed && <div className={videoStyles.loadingBadge}>جارٍ تحميل المشهد السينمائي...</div>}
      {active && videoFailed && <div className={videoStyles.errorBadge}>تعذر تحميل الفيديو، تم تشغيل النسخة الاحتياطية.</div>}

      {status === "idle" && (
        <div className={startStyles.startGate}>
          <div className={startStyles.startEmblem} aria-hidden="true">♞</div>
          <span className={startStyles.startKicker}>{mode === "preview" ? "فيلم هدية تفاعلي" : "هدية إنجاز جديدة"}</span>
          <h1>الخيل العربي</h1>
          <p>مشهد حقيقي لخيل أدهم يعدو، مع وقع الحوافر والصهيل والغبار والمؤثرات السينمائية.</p>
          <button ref={startButtonRef} type="button" onClick={onStart} disabled={loading}>
            <span>▶</span>{loading ? "جارٍ تجهيز الصوت..." : "تشغيل الفيلم بالصوت"}
          </button>
        </div>
      )}
    </div>
  );
}
