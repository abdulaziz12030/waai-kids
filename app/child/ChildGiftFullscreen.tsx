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
    video.volume = 1;
    video.muted = false;
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => undefined);
    });
    return () => video.pause();
  }, [mounted]);

  if (!mounted || !config.videoUrl) return null;

  return createPortal(
    <div className={styles.overlay} style={{ zIndex: 100000 }}>
      <video ref={videoRef} className={styles.video} src={config.videoUrl} playsInline preload="auto" onEnded={onEnded} />
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 10, direction: "rtl", padding: "8px 12px", borderRadius: 16, background: "#19150d", color: "#fff2c3", fontWeight: 950 }}>
        <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 13, background: "#d5a84e", color: "#171005", fontSize: 22 }}>و</span>
        <strong>واعي كيدز</strong>
      </div>
    </div>,
    document.body
  );
}
