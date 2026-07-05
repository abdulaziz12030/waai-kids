"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChildGift } from "./gifts/types";
import { getGiftPreviewConfig } from "../components/giftPreviewConfig";
import styles from "./ChildGiftFullscreen.module.css";

export default function ChildGiftFullscreen({ gift, onEnded }: { gift: ChildGift; onEnded: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const config = useMemo(() => getGiftPreviewConfig(gift.gift), [gift]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = 0;
    video.volume = 1;
    video.muted = false;

    void video.play().then(() => {
      setNeedsSoundTap(false);
    }).catch(() => {
      video.muted = true;
      setNeedsSoundTap(true);
      void video.play().catch(() => undefined);
    });

    return () => video.pause();
  }, [mounted]);

  async function enableSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
      setNeedsSoundTap(false);
    } catch {
      setNeedsSoundTap(true);
    }
  }

  if (!mounted || !config.videoUrl) return null;

  return createPortal(
    <div className={styles.overlay} style={{ zIndex: 100000 }}>
      <video ref={videoRef} className={styles.video} src={config.videoUrl} playsInline preload="auto" onEnded={onEnded} />
      <div className={styles.brandBadge}>
        <span>و</span>
        <strong>واعي كيدز</strong>
      </div>
      {needsSoundTap && (
        <button className={styles.soundButton} type="button" onClick={() => void enableSound()}>
          🔊 تشغيل الهدية بالصوت
        </button>
      )}
    </div>,
    document.body
  );
}
