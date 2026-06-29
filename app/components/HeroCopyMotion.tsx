"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./HeroCopyMotion.module.css";
import textStyles from "./HeroTextMobile.module.css";
import entryStyles from "./HeroEntryInteractive.module.css";

function applyEntryMotion(event: ReactPointerEvent<HTMLAnchorElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

  card.style.setProperty("--move-x", `${((x - 0.5) * 10).toFixed(2)}px`);
  card.style.setProperty("--move-y", `${((y - 0.5) * 6).toFixed(2)}px`);
  card.style.setProperty("--rotate-x", `${((0.5 - y) * 3).toFixed(2)}deg`);
  card.style.setProperty("--rotate-y", `${((x - 0.5) * 3).toFixed(2)}deg`);
  card.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
  card.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
}

function resetEntryMotion(card: HTMLAnchorElement) {
  card.style.setProperty("--move-x", "0px");
  card.style.setProperty("--move-y", "0px");
  card.style.setProperty("--rotate-x", "0deg");
  card.style.setProperty("--rotate-y", "0deg");
  card.classList.remove(entryStyles.activeEntry);
}

export default function HeroCopyMotion() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const interactionProps = {
    onPointerEnter: (event: ReactPointerEvent<HTMLAnchorElement>) => {
      event.currentTarget.classList.add(entryStyles.activeEntry);
      applyEntryMotion(event);
    },
    onPointerMove: applyEntryMotion,
    onPointerDown: (event: ReactPointerEvent<HTMLAnchorElement>) => {
      event.currentTarget.classList.add(entryStyles.activeEntry);
      applyEntryMotion(event);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLAnchorElement>) => resetEntryMotion(event.currentTarget),
    onPointerCancel: (event: ReactPointerEvent<HTMLAnchorElement>) => resetEntryMotion(event.currentTarget),
    onPointerLeave: (event: ReactPointerEvent<HTMLAnchorElement>) => resetEntryMotion(event.currentTarget)
  };

  return (
    <div ref={ref} className={`namaa-hero-copy ${styles.copy} ${visible ? styles.visible : ""}`}>
      <span className={styles.eyebrow}>💚 منصة تربوية ذكية للأسرة والطفل والمعلم</span>

      <h1 className={`${styles.title} ${textStyles.titleBalance}`}>
        <span>ننمي الوعي</span>
        <span>ونحوّل <em>الأهداف</em> إلى</span>
        <strong>إنجاز</strong>
      </h1>

      <p className={`${styles.description} ${textStyles.detailText}`}>
        واعي كيدز منصة تربوية ذكية تساعد الأسرة والمعلم على تنمية <span className={textStyles.keyword}>وعي الطفل</span>، وبناء عاداته الإيجابية، وتحقيق <span className={textStyles.keyword}>أهدافه</span>، ومتابعة حفظه <span className={textStyles.keyword}>للقرآن</span>، وتحفيزه <span className={textStyles.keyword}>بالمكافآت والهدايا الهادفة</span>.
      </p>

      <div className={styles.entries}>
        <a className={`${styles.entry} ${styles.parent} ${entryStyles.interactiveEntry}`} href="/login?type=family" {...interactionProps}>
          <span className={entryStyles.ambientGlow} aria-hidden="true" />
          <span className={`${styles.entryIcon} ${entryStyles.iconDepth}`}>👤</span>
          <span className={`${styles.entryText} ${entryStyles.textDepth}`}><strong>دخول ولي الأمر</strong><small>إدارة ومتابعة الأبناء</small></span>
          <span className={`${styles.entryArrow} ${entryStyles.arrowPulse}`}>←</span>
        </a>

        <a className={`${styles.entry} ${styles.child} ${entryStyles.interactiveEntry}`} href="/child/login" {...interactionProps}>
          <span className={entryStyles.ambientGlow} aria-hidden="true" />
          <span className={`${styles.entryIcon} ${entryStyles.iconDepth}`}>🧒🏻</span>
          <span className={`${styles.entryText} ${entryStyles.textDepth}`}><strong>دخول الطفل</strong><small>إنجاز المهام وكسب النقاط</small></span>
          <span className={`${styles.entryArrow} ${entryStyles.arrowPulse}`}>←</span>
        </a>

        <a className={`${styles.entry} ${styles.teacher} ${entryStyles.interactiveEntry}`} href="/login?type=teacher" {...interactionProps}>
          <span className={entryStyles.ambientGlow} aria-hidden="true" />
          <span className={`${styles.entryIcon} ${entryStyles.iconDepth}`}>👨‍🏫</span>
          <span className={`${styles.entryText} ${entryStyles.textDepth}`}><strong>دخول المعلم</strong><small>إدارة الحفظ ومركز التسميع</small></span>
          <span className={`${styles.entryArrow} ${entryStyles.arrowPulse}`}>←</span>
        </a>
      </div>

      <div className={styles.security}>🔒 بياناتك آمنة ومشفرة</div>
    </div>
  );
}
