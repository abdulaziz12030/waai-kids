"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./AboutWaaiMotion.module.css";

export default function AboutWaaiMotion() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px 12% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function handleTextMove(event: ReactPointerEvent<HTMLDivElement>) {
    const panel = event.currentTarget;
    const rect = panel.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    panel.style.setProperty("--mx", `${((x - 0.5) * 10).toFixed(2)}px`);
    panel.style.setProperty("--my", `${((y - 0.5) * 8).toFixed(2)}px`);
    panel.style.setProperty("--px", `${(x * 100).toFixed(1)}%`);
    panel.style.setProperty("--py", `${(y * 100).toFixed(1)}%`);
  }

  function resetTextMove() {
    const panel = textRef.current;
    if (!panel) return;
    panel.style.setProperty("--mx", "0px");
    panel.style.setProperty("--my", "0px");
    setActive(false);
  }

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${visible ? styles.visible : ""}`}
      id="about"
    >
      <div
        ref={textRef}
        className={`${styles.textInteractive} ${active ? styles.active : ""}`}
        onPointerEnter={(event) => {
          setActive(true);
          handleTextMove(event);
        }}
        onPointerMove={handleTextMove}
        onPointerDown={(event) => {
          setActive(true);
          handleTextMove(event);
        }}
        onPointerUp={resetTextMove}
        onPointerLeave={resetTextMove}
        onPointerCancel={resetTextMove}
      >
        <span className={styles.textGlow} aria-hidden="true" />
        <span className={styles.textShine} aria-hidden="true" />

        <span className={styles.badge}>عن واعي كيدز</span>

        <h2 className={styles.title}>
          <span className={styles.titleLine}>رحلة تربوية تجمع</span>
          <span className={styles.titleAccent}>الأسرة والطفل والمعلم</span>
        </h2>

        <p className={styles.description}>
          يجمع واعي كيدز <strong>الأهداف والمهام</strong> و<strong>التحفيز</strong> و<strong>حفظ القرآن</strong> في تجربة واحدة ممتعة، مع أدوار واضحة للأسرة والمعلم، ومساحة آمنة تمكّن الطفل من رؤية تقدمه والاعتزاز بإنجازاته.
        </p>
      </div>

      <div className={styles.values} aria-label="قيم واعي كيدز">
        <span><i>🎯</i> هدف واضح</span>
        <span><i>🌱</i> نمو مستمر</span>
        <span><i>🤝</i> أسرة ومعلم</span>
        <span><i>⭐</i> إنجاز محفّز</span>
      </div>
    </section>
  );
}
