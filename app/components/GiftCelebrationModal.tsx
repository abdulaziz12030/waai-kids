"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import ArabianHorseScene from "./ArabianHorseScene";
import GiftParticleCanvas from "./GiftParticleCanvas";
import ImmersiveGiftArtwork from "./ImmersiveGiftArtwork";
import {
  GiftMotionType,
  PreviewGiftLike,
  getGiftPreviewConfig,
  interpolateGiftText
} from "./giftPreviewConfig";
import styles from "./ImmersiveGiftExperience.module.css";

type GiftCelebrationModalProps = {
  gift: PreviewGiftLike;
  childName: string;
  achievement: string;
  reason?: string | null;
  mode?: "preview" | "delivery";
  senderName?: string;
  certificateNumber?: string;
  giftedAt?: string;
  priceLabel?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onPrintCertificate?: () => void;
  onClose: () => void;
};

type SceneStatus = "idle" | "playing" | "finished";

function playSyntheticChime(motion: GiftMotionType, volume: number) {
  if (!("AudioContext" in window)) return null;
  const context = new AudioContext();
  const noteSets: Record<Exclude<GiftMotionType, "arabian-horse">, number[]> = {
    "crown-drop": [392, 523.25, 659.25, 783.99, 1046.5],
    "shield-shine": [220, 330, 493.88, 659.25],
    "quran-light": [392, 523.25, 659.25, 783.99],
    "medal-spin": [329.63, 440, 659.25, 880],
    "warm-hearts": [440, 554.37, 659.25, 880],
    "star-burst": [392, 523.25, 659.25, 783.99, 1046.5],
    "letter-open": [293.66, 440, 587.33, 783.99],
    "gift-float": [329.63, 440, 659.25, 783.99]
  };
  const notes = motion === "arabian-horse" ? noteSets["gift-float"] : noteSets[motion];
  const now = context.currentTime + 0.025;
  const level = Math.min(0.16, Math.max(0.035, volume * 0.38));

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = motion === "shield-shine" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.115);
    gain.gain.setValueAtTime(0.0001, now + index * 0.115);
    gain.gain.exponentialRampToValueAtTime(level, now + index * 0.115 + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.115 + 0.72);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.115);
    oscillator.stop(now + index * 0.115 + 0.78);
  });

  window.setTimeout(() => void context.close(), 2400);
  return context;
}

function PreviewCertificate({
  gift,
  childName,
  achievement,
  reason,
  certificateNumber,
  dateLabel
}: {
  gift: PreviewGiftLike;
  childName: string;
  achievement: string;
  reason?: string | null;
  certificateNumber?: string;
  dateLabel: string;
}) {
  return (
    <article className={styles.certificate} aria-label="معاينة شهادة التكريم">
      <div className={styles.certificateFrame} aria-hidden="true"><span /><span /><span /><span /></div>
      <div className={styles.certificateBrand}>
        <span>و</span>
        <div><strong>واعي كيدز</strong><small>WAAI KIDS</small></div>
      </div>
      <span className={styles.certificateIcon}>{gift.icon}</span>
      <p className={styles.certificateKicker}>شهادة شكر وتقدير</p>
      <h2>{gift.certificate_title || gift.name}</h2>
      <p>تُقدَّم بكل فخر إلى</p>
      <h3>{childName}</h3>
      <p>تقديرًا لإنجازه المميز: <strong>{achievement}</strong></p>
      {reason && <p>{reason}</p>}
      <div className={styles.certificateMeta}>
        <span>الهدية: {gift.name}</span>
        <span>التاريخ: {dateLabel}</span>
        {certificateNumber && <span>رقم الشهادة: {certificateNumber}</span>}
      </div>
      <strong className={styles.tagline}>ينمو بوعي ويُنجز بثقة</strong>
    </article>
  );
}

export default function GiftCelebrationModal({
  gift,
  childName,
  achievement,
  reason,
  mode = "preview",
  senderName,
  certificateNumber,
  giftedAt,
  priceLabel,
  primaryActionLabel,
  onPrimaryAction,
  onPrintCertificate,
  onClose
}: GiftCelebrationModalProps) {
  const config = useMemo(() => getGiftPreviewConfig(gift), [gift]);
  const isArabianHorse = config.motionType === "arabian-horse";
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<SceneStatus>("idle");
  const [runId, setRunId] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const launchButtonRef = useRef<HTMLButtonElement | null>(null);

  const greeting = interpolateGiftText(config.greeting, childName);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(giftedAt ? new Date(giftedAt) : new Date()), [giftedAt]);

  const resolvedPrice = priceLabel || (gift.tier === "included"
    ? "ضمن الاشتراك"
    : gift.coin_price
      ? `${gift.coin_price} كوينز`
      : "هدية رقمية");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let active = true;
    let generatedUrl: string | null = null;
    if (config.audioKey === "arabian-horse") {
      void import("./giftAudio/arabianHorse").then((module) => {
        const url = module.default();
        if (active) {
          generatedUrl = url;
          setAudioSource(url);
        } else {
          URL.revokeObjectURL(url);
        }
      });
    } else {
      setAudioSource(null);
    }
    return () => {
      active = false;
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
    };
  }, [config.audioKey]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    launchButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showCertificate) setShowCertificate(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      audioRef.current?.pause();
      void audioContextRef.current?.close();
    };
  }, [mounted, onClose, showCertificate]);

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setTimeout(() => setStatus("finished"), config.durationMs);
    return () => window.clearTimeout(timer);
  }, [config.durationMs, runId, status]);

  function stopSound() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  function playSound() {
    if (muted) return;
    if (audioRef.current && audioSource) {
      audioRef.current.volume = config.volume;
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => undefined);
      return;
    }
    audioContextRef.current = playSyntheticChime(config.motionType, config.volume);
  }

  function runCelebration() {
    stopSound();
    setShowCertificate(false);
    setStatus("playing");
    setRunId((current) => current + 1);
    playSound();
  }

  function toggleMute() {
    setMuted((current) => {
      const next = !current;
      if (next) stopSound();
      return next;
    });
  }

  if (!mounted) return null;

  const soundLoading = Boolean(config.audioKey && !audioSource);

  const fullScreenExperience = (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${mode === "preview" ? "معاينة" : "عرض"} ${gift.name}`}>
      <section
        key={runId}
        className={`${styles.experience} ${status === "playing" ? styles.isPlaying : ""} ${status === "finished" ? styles.isFinished : ""}`}
        data-background={config.background}
        data-motion={config.motionType}
        data-effects={config.effects}
      >
        {!isArabianHorse && (
          <div className={styles.cinematicBackdrop} aria-hidden="true">
            <div className={styles.skyGradient} />
            <div className={styles.ambientGlow} />
            <div className={styles.lightBeams}>{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</div>
            <div className={styles.speedLines}>{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
            <div className={styles.dunes}><span /><span /><span /></div>
            <div className={styles.horizonGlow} />
            <div className={styles.vignette} />
            <div className={styles.filmGrain} />
          </div>
        )}

        {!isArabianHorse && <GiftParticleCanvas motion={config.motionType} active={status !== "idle"} />}

        <header className={styles.hud}>
          <div className={styles.brandLockup}>
            <span>و</span>
            <div><strong>واعي كيدز</strong><small>WAAI KIDS</small></div>
          </div>
          <div className={styles.hudMeta}>
            <span>{mode === "preview" ? "معاينة تفاعلية" : "هدية إنجاز"}</span>
            <strong>{resolvedPrice}</strong>
          </div>
          <div className={styles.hudActions}>
            <button type="button" onClick={toggleMute} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} aria-pressed={muted}>{muted ? "🔇" : "🔊"}</button>
            <button type="button" onClick={onClose} aria-label="إغلاق الهدية">×</button>
          </div>
        </header>

        {mode === "preview" && <div className={styles.previewRibbon}>معاينة فقط · لن يتم خصم كوينز أو إرسال هدية</div>}

        <main className={styles.scene}>
          {isArabianHorse ? (
            <ArabianHorseScene
              gift={gift}
              childName={childName}
              achievement={achievement}
              reason={reason}
              senderName={mode === "delivery" ? senderName : undefined}
              status={status}
              mode={mode}
              loading={soundLoading}
              startButtonRef={launchButtonRef}
              onStart={runCelebration}
            />
          ) : (
            <>
              <p className={styles.greeting}>{greeting}</p>
              <ImmersiveGiftArtwork gift={gift} motion={config.motionType} />
              <div className={styles.impactBurst} aria-hidden="true"><span /><span /><span /><span /></div>
              <div className={styles.finalMessage}>
                <span className={styles.giftBadge}>{gift.icon}</span>
                <h2>{config.revealText}</h2>
                <p>بمناسبة <strong>{achievement}</strong></p>
                {reason && <small>{reason}</small>}
                {mode === "delivery" && senderName && <em>بكل فخر ومحبة من {senderName}</em>}
              </div>

              {status === "idle" && (
                <div className={styles.launchGate}>
                  <div className={styles.launchHalo} />
                  <span className={styles.launchIcon}>{gift.icon}</span>
                  <p>{mode === "preview" ? "شاهد تجربة الهدية كما ستظهر للطفل" : "لديك هدية إنجاز جديدة"}</p>
                  <h1>{gift.name}</h1>
                  <small>{gift.description || "لحظة احتفالية تملأ الشاشة وتخلّد الإنجاز."}</small>
                  <button ref={launchButtonRef} type="button" onClick={runCelebration} disabled={soundLoading}>
                    <span>▶</span>{soundLoading ? "جارٍ تجهيز التجربة..." : mode === "preview" ? "تشغيل المعاينة" : "فتح الهدية"}
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {(!isArabianHorse || status !== "idle") && (
          <footer className={styles.controlDock}>
            <button type="button" onClick={runCelebration} disabled={soundLoading}>↻ <span>إعادة التشغيل</span></button>
            <button type="button" onClick={() => setShowCertificate(true)}>📜 <span>معاينة الشهادة</span></button>
            {onPrintCertificate && <button type="button" onClick={onPrintCertificate}>🖨️ <span>طباعة الشهادة</span></button>}
            {primaryActionLabel && onPrimaryAction && <button className={styles.primaryAction} type="button" onClick={onPrimaryAction}>{primaryActionLabel}</button>}
            <button className={styles.closeAction} type="button" onClick={onClose}>إغلاق</button>
          </footer>
        )}

        {config.audioKey && <audio ref={audioRef} src={audioSource || undefined} preload="none" aria-hidden="true" />}

        {showCertificate && (
          <div className={styles.certificateOverlay} role="dialog" aria-modal="true" aria-label="معاينة الشهادة">
            <div className={styles.certificateToolbar}>
              <div><strong>معاينة الشهادة</strong><small>واعي كيدز · ينمو بوعي ويُنجز بثقة</small></div>
              <button type="button" onClick={() => setShowCertificate(false)}>العودة إلى الهدية</button>
            </div>
            <PreviewCertificate
              gift={gift}
              childName={childName}
              achievement={achievement}
              reason={reason}
              certificateNumber={certificateNumber}
              dateLabel={dateLabel}
            />
          </div>
        )}
      </section>
    </div>
  );

  return createPortal(fullScreenExperience, document.body);
}
