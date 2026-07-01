"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChildGift } from "./gifts/types";
import { getGiftPreviewConfig } from "../components/giftPreviewConfig";
import styles from "./ChildGiftFullscreen.module.css";

export default function ChildGiftFullscreen({ gift, onEnded }: { gift: ChildGift; onEnded: () => void }) {
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const config = useMemo(() => getGiftPreviewConfig(gift.gift), [gift]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = 0;
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => undefined);
    });
    return () => video.pause();
  }, [mounted]);

  if (!mounted || !config.videoUrl) return null;

  return createPortal(
    <div className={styles.overlay}>
      <video ref={videoRef} className={styles.video} src={config.videoUrl} playsInline preload="auto" onEnded={onEnded} />
      <div className={styles.brand}><span>و</span><strong>واعي كيدز</strong></div>
    </div>,
    document.body
  );
}
