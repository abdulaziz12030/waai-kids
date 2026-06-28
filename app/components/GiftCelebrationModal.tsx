"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PreviewGiftLike,
  getGiftPreviewConfig,
  interpolateGiftText
} from "./giftPreviewConfig";
import styles from "./GiftCelebrationModal.module.css";

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

function ArabianHorseArtwork() {
  return (
    <div className={styles.horseRunner} aria-hidden="true">
      <div className={styles.dustCloud}>
        {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
      </div>
      <svg className={styles.horseSvg} viewBox="0 0 440 260" role="img" aria-label="خيل عربي يعدو">
        <defs>
          <linearGradient id="horseCoat" x1="75" y1="55" x2="350" y2="230" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2b1a12" />
            <stop offset=".55" stopColor="#5b3420" />
            <stop offset="1" stopColor="#1b110d" />
          </linearGradient>
          <linearGradient id="horseHighlight" x1="115" y1="78" x2="330" y2="185" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b8793d" stopOpacity=".82" />
            <stop offset="1" stopColor="#6e3e22" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className={styles.horseTail}>
          <path d="M88 116C35 89 18 116 37 129C15 132 13 151 43 151C20 166 45 181 83 158C106 144 111 124 88 116Z" fill="#21130e" />
          <path d="M91 123C57 116 48 133 66 138C49 145 61 157 87 145" fill="none" stroke="#8a512c" strokeWidth="8" strokeLinecap="round" />
        </g>
        <g className={styles.backLeg}>
          <path d="M145 166C137 190 126 214 111 239L133 243C151 220 166 196 176 169Z" fill="url(#horseCoat)" />
          <path d="M111 237L103 249L140 250L133 242Z" fill="#15100d" />
        </g>
        <g className={styles.backLegAlt}>
          <path d="M185 170C186 197 197 218 213 239L234 232C220 207 214 187 214 166Z" fill="url(#horseCoat)" />
          <path d="M213 238L209 249L244 245L234 231Z" fill="#15100d" />
        </g>
        <path className={styles.horseBody} d="M98 110C131 75 223 72 282 103C310 118 316 151 287 169C245 195 149 190 108 159C91 146 86 124 98 110Z" fill="url(#horseCoat)" />
        <path d="M121 102C166 83 229 86 270 107C232 103 174 112 139 140C121 130 114 116 121 102Z" fill="url(#horseHighlight)" opacity=".7" />
        <g className={styles.frontLeg}>
          <path d="M273 158C282 182 291 205 306 231L329 222C317 195 310 175 307 151Z" fill="url(#horseCoat)" />
          <path d="M306 230L306 244L339 232L329 221Z" fill="#15100d" />
        </g>
        <g className={styles.frontLegAlt}>
          <path d="M245 166C239 191 236 217 238 244L261 244C266 216 270 191 278 166Z" fill="url(#horseCoat)" />
          <path d="M237 242L232 251L269 251L261 243Z" fill="#15100d" />
        </g>
        <g className={styles.horseNeck}>
          <path d="M267 110C277 77 289 46 316 34C340 23 369 33 381 54C391 73 380 92 360 95C345 98 333 91 325 81C318 109 317 139 297 159Z" fill="url(#horseCoat)" />
          <path d="M309 41C292 57 287 86 282 119" fill="none" stroke="#17100d" strokeWidth="15" strokeLinecap="round" />
          <path d="M334 39L326 17L347 32Z" fill="#3d2418" />
          <path d="M360 45L361 21L377 43Z" fill="#3d2418" />
          <path d="M355 58C372 54 397 63 410 74C402 91 381 99 359 93Z" fill="url(#horseCoat)" />
          <circle cx="357" cy="53" r="4.5" fill="#f7d680" />
          <circle cx="358" cy="52" r="1.5" fill="#fff" />
          <path d="M398 75C405 77 411 79 417 78" stroke="#160f0d" strokeWidth="4" strokeLinecap="round" />
        </g>
        <path className={styles.horseMane} d="M314 38C293 51 285 70 283 96C296 87 307 75 313 60C315 77 319 91 327 103C329 77 325 54 314 38Z" fill="#17100d" />
      </svg>
    </div>
  );
}

function GenericGiftArtwork({ gift }: { gift: PreviewGiftLike }) {
  return (
    <div className={styles.genericArtwork} aria-hidden="true">
      <span className={styles.aura} />
      <span className={styles.genericIcon}>{gift.icon}</span>
      <span className={styles.shine} />
    </div>
  );
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
  const [status, setStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [runId, setRunId] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startButtonRef = useRef<HTMLButtonElement | null>(null);

  const greeting = interpolateGiftText(config.greeting, childName);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(giftedAt ? new Date(giftedAt) : new Date()), [giftedAt]);

  useEffect(() => {
    let active = true;
    if (config.audioKey === "arabian-horse") {
      void import("./giftAudio/arabianHorse").then((module) => {
        if (active) setAudioSource(module.default);
      });
    } else {
      setAudioSource(null);
    }
    return () => { active = false; };
  }, [config.audioKey]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    startButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [onClose]);

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
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function playSound() {
    if (muted) return;
    if (audioRef.current && audioSource) {
      audioRef.current.volume = config.volume;
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => undefined);
      return;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const message = new SpeechSynthesisUtterance(greeting);
      message.lang = "ar-SA";
      message.rate = 0.86;
      message.volume = Math.min(0.65, config.volume + 0.25);
      window.speechSynthesis.speak(message);
    }
  }

  function runCelebration() {
    stopSound();
    setShowCertificate(false);
    setRunId((current) => current + 1);
    setStatus("playing");
    playSound();
  }

  function toggleMute() {
    setMuted((current) => {
      const next = !current;
      if (next) stopSound();
      return next;
    });
  }

  function closeFromBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  const soundLoading = Boolean(config.audioKey && !audioSource);
  const resolvedPrice = priceLabel || (gift.tier === "included"
    ? "ضمن الاشتراك"
    : gift.coin_price
      ? `${gift.coin_price} كوينز`
      : "هدية رقمية");

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`معاينة ${gift.name}`} onMouseDown={closeFromBackdrop}>
      <section className={styles.modal}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{mode === "preview" ? "معاينة تجريبية" : "هدية جديدة"}</span>
            <h2>{gift.name}</h2>
            <p>{gift.description || "هدية رقمية احتفالية تُخلّد إنجاز الطفل."}</p>
          </div>
          <div className={styles.headerMeta}>
            <strong>{resolvedPrice}</strong>
            <button type="button" onClick={onClose} aria-label="إغلاق المعاينة">×</button>
          </div>
        </header>

        {mode === "preview" && <p className={styles.safetyNote}>هذه معاينة فقط، ولن يتم خصم كوينز أو إرسال هدية حقيقية.</p>}

        <div
          key={runId}
          className={`${styles.scene} ${status !== "idle" ? styles.sceneRunning : ""}`}
          data-background={config.background}
          data-motion={config.motionType}
          data-effects={config.effects}
        >
          <div className={styles.skyGlow} />
          <div className={styles.dunes}><span /><span /><span /></div>
          <div className={styles.sparkles} aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => <span key={index}>✦</span>)}
          </div>

          <p className={styles.greeting}>{greeting}</p>
          {config.motionType === "arabian-horse" ? <ArabianHorseArtwork /> : <GenericGiftArtwork gift={gift} />}
          <div className={styles.finalMessage}>
            <h3>{config.revealText}</h3>
            <p>بمناسبة {achievement}</p>
            {mode === "delivery" && senderName && <small>بكل فخر ومحبة من {senderName}</small>}
          </div>

          {status === "idle" && (
            <button ref={startButtonRef} className={styles.startButton} type="button" onClick={runCelebration} disabled={soundLoading}>
              <span>▶</span> {soundLoading ? "جارٍ تجهيز الصوت..." : "تشغيل المعاينة"}
            </button>
          )}
        </div>

        <div className={styles.controls}>
          <button type="button" onClick={runCelebration} disabled={soundLoading}>↻ إعادة التشغيل</button>
          <button type="button" onClick={toggleMute} aria-pressed={muted}>{muted ? "🔇 تشغيل الصوت" : "🔊 كتم الصوت"}</button>
          <button type="button" onClick={() => setShowCertificate(true)}>📜 معاينة الشهادة</button>
          {onPrintCertificate && <button type="button" onClick={onPrintCertificate}>🖨️ طباعة الشهادة</button>}
          {primaryActionLabel && onPrimaryAction && <button className={styles.primaryAction} type="button" onClick={onPrimaryAction}>{primaryActionLabel}</button>}
          <button className={styles.closeAction} type="button" onClick={onClose}>إغلاق</button>
        </div>

        {config.audioKey && <audio ref={audioRef} src={audioSource || undefined} preload="none" aria-hidden="true" />}

        {showCertificate && (
          <div className={styles.certificateOverlay} role="dialog" aria-modal="true" aria-label="معاينة الشهادة">
            <div className={styles.certificateToolbar}>
              <strong>معاينة الشهادة</strong>
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
}
