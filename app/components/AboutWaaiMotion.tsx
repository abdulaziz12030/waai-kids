"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./AboutWaaiMotion.module.css";

export default function AboutWaaiMotion() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [textActive, setTextActive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px 15% 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  function handleSectionPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const section = event.currentTarget;
    const rect = section.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    section.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
    section.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
    section.style.setProperty("--tilt-x", `${((0.5 - y) * 1.2).toFixed(2)}deg`);
    section.style.setProperty("--tilt-y", `${((x - 0.5) * 1.2).toFixed(2)}deg`);
  }

  function resetSectionPointer() {
    const section = sectionRef.current;
    if (!section) return;
    section.style.setProperty("--tilt-x", "0deg");
    section.style.setProperty("--tilt-y", "0deg");
  }

  function handleTextPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const panel = event.currentTarget;
    const rect = panel.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    panel.style.setProperty("--text-x", `${(x * 100).toFixed(1)}%`);
    panel.style.setProperty("--text-y", `${(y * 100).toFixed(1)}%`);
    panel.style.setProperty("--text-shift-x", `${((x - 0.5) * 6).toFixed(2)}px`);
    panel.style.setProperty("--text-shift-y", `${((y - 0.5) * 4).toFixed(2)}px`);
  }

  function resetTextPanel(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--text-shift-x", "0px");
    event.currentTarget.style.setProperty("--text-shift-y", "0px");
    setTextActive(false);
  }

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${visible ? styles.visible : ""}`}
      id="about"
      onPointerMove={handleSectionPointerMove}
      onPointerLeave={resetSectionPointer}
    >
      <span className={styles.pointerGlow} aria-hidden="true" />
      <span className={styles.orbitLine} aria-hidden="true" />

      <div
        className={`${styles.textPanel} ${textActive ? styles.textPanelActive : ""}`}
        onPointerEnter={handleTextPointerMove}
        onPointerMove={handleTextPointerMove}
        onPointerDown={(event) => {
          setTextActive(true);
          handleTextPointerMove(event);
        }}
        onPointerUp={resetTextPanel}
        onPointerCancel={resetTextPanel}
        onPointerLeave={resetTextPanel}
      >
        <span className={styles.textGlow} aria-hidden="true" />
        <span className={styles.textSweep} aria-hidden="true" />

        <div className={styles.heading}>
          <span className={styles.badge}>عن واعي كيدز</span>
          <h2>
            <span className={styles.titleLine}>رحلة تربوية تجمع</span>
            <span className={styles.titleAccent}>الأسرة والطفل والمعلم</span>
          </h2>
        </div>

        <div className={styles.content}>
          <p>
            يجمع واعي كيدز <strong>الأهداف والمهام</strong> و<strong>التحفيز</strong> و<strong>حفظ القرآن</strong> في تجربة واحدة ممتعة، مع أدوار واضحة للأسرة والمعلم، ومساحة آمنة تمكّن الطفل من رؤية تقدمه والاعتزاز بإنجازاته.
          </p>
        </div>
      </div>

      <div className={styles.values} aria-label="قيم واعي كيدز">
        <span><i>🎯</i> هدف واضح</span>
        <span><i>🌱</i> نمو مستمر</span>
        <span><i>🤝</i> أسرة ومعلم</span>
        <span><i>⭐</i> إنجاز محفّز</span>
      </div>

      <span className={`${styles.spark} ${styles.sparkOne}`} aria-hidden="true" />
      <span className={`${styles.spark} ${styles.sparkTwo}`} aria-hidden="true" />
      <span className={`${styles.spark} ${styles.sparkThree}`} aria-hidden="true" />
    </section>
  );
}
