"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChildGift } from "./gifts/types";
import { getGiftPreviewConfig } from "../components/giftPreviewConfig";
import styles from "./ChildGiftFullscreen.module.css";

export default function ChildGiftFullscreen({ gift, onEnded }: { gift: ChildGift; onEnded: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [childName, setChildName] = useState("بطل واعي كيدز");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const soundStartedRef = useRef(false);
  const unlockingRef = useRef(false);
  const finishedRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const config = useMemo(() => getGiftPreviewConfig(gift.gift), [gift]);

  useEffect(() => {
    setMounted(true);
    const storedName = localStorage.getItem("namaa_child_name")?.trim();
    if (storedName) setChildName(storedName);
  }, []);

  useEffect(() => {
    if (!mounted || !videoRef.current) return;

    const video = videoRef.current;
    let disposed = false;
    finishedRef.current = false;
    soundStartedRef.current = false;
    unlockingRef.current = false;

    const removeUnlockListeners = () => {
      window.removeEventListener("pointerdown", unlockFromGesture, true);
      window.removeEventListener("touchend", unlockFromGesture, true);
      window.removeEventListener("keydown", unlockFromGesture, true);
    };

    const playWithFullSound = async (restart: boolean) => {
      if (disposed || finishedRef.current) return false;
      video.pause();
      if (restart) video.currentTime = 0;
      video.volume = 1;
      video.muted = false;

      try {
        await video.play();
        soundStartedRef.current = true;
        removeUnlockListeners();
        return true;
      } catch {
        return false;
      }
    };

    function unlockFromGesture() {
      if (soundStartedRef.current || unlockingRef.current || finishedRef.current || disposed) return;
      unlockingRef.current = true;
      void playWithFullSound(true).then((started) => {
        unlockingRef.current = false;
        if (started || disposed || finishedRef.current) return;
        video.muted = true;
        void video.play().catch(() => undefined);
      });
    }

    video.currentTime = 0;
    video.volume = 1;
    video.muted = false;

    window.addEventListener("pointerdown", unlockFromGesture, true);
    window.addEventListener("touchend", unlockFromGesture, true);
    window.addEventListener("keydown", unlockFromGesture, true);

    unlockingRef.current = true;
    void playWithFullSound(false).then((started) => {
      unlockingRef.current = false;
      if (started || disposed || finishedRef.current) return;

      // بعض متصفحات الجوال تمنع الصوت التلقائي حتى أول لمسة. نبدأ العرض
      // دون إظهار أي زر، ثم تعيد أول لمسة طبيعية تشغيله من البداية بصوت كامل.
      video.muted = true;
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    });

    return () => {
      disposed = true;
      removeUnlockListeners();
      video.pause();
      if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    };
  }, [mounted, config.videoUrl]);

  function handleVideoEnded() {
    finishedRef.current = true;
    setFinished(true);
    finishTimerRef.current = window.setTimeout(onEnded, 6500);
  }

  if (!mounted || !config.videoUrl) return null;

  return createPortal(
    <div className={styles.overlay} style={{ zIndex: 100000 }} role="dialog" aria-modal="true" aria-label="هدية الخيل العربي">
      <video
        ref={videoRef}
        className={styles.video}
        src={config.videoUrl}
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        onEnded={handleVideoEnded}
        aria-label="فيديو هدية الخيل العربي"
      />

      <div className={styles.brandBadge}>
        <span>و</span>
        <strong>واعي كيدز</strong>
      </div>

      {finished && (
        <div className={styles.finalOverlay} aria-live="polite">
          <section className={styles.finalCard}>
            <span className={styles.horseMark} aria-hidden="true">♞</span>
            <p className={styles.kicker}>ما شاء الله تبارك الله</p>
            <h1>أحسنت يا {childName}</h1>
            <p className={styles.tribute}>
              إنجازك اليوم دليل على عزيمتك وتميّزك، وهدية الخيل العربي تليق بفارسٍ يواصل طريقه بثقة.
            </p>
            <div className={styles.achievement}>
              <span>الإنجاز المكرَّم</span>
              <strong>{gift.achievement_title}</strong>
            </div>
            {gift.reason && <p className={styles.reason}>{gift.reason}</p>}
            <p className={styles.sender}>بكل فخر ومحبة من {gift.sender_name}</p>
            <small>ينمو بوعي ويُنجز بثقة</small>
          </section>
        </div>
      )}
    </div>,
    document.body
  );
}
