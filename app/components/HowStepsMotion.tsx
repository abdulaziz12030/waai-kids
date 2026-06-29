"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HowStepsMotion.module.css";

type Step = {
  number: string;
  icon: string;
  title: string;
  description: string;
};

export default function HowStepsMotion({ steps }: { steps: Step[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

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
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.section} ${visible ? styles.visible : ""}`} id="how">
      <div className={styles.heading}>
        <span>🌱 خطوات بسيطة لبناء طفل واعٍ وواثق</span>
        <h2>كيف يعمل واعي كيدز؟</h2>
      </div>

      <div className={styles.steps}>
        {steps.map((step, index) => (
          <article
            key={step.number}
            className={`${styles.step} ${index % 2 === 0 ? styles.fromRight : styles.fromLeft}`}
            style={{ "--step-delay": `${260 + index * 420}ms` } as React.CSSProperties}
          >
            <b className={styles.number}>{step.number}</b>
            <div className={`${styles.art} ${styles[`art${index + 1}` as keyof typeof styles] ?? ""}`}>
              <span className={styles.glow} aria-hidden="true" />
              <span className={styles.icon}>{step.icon}</span>
              <span className={styles.ring} aria-hidden="true" />
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            {index < steps.length - 1 && <span className={styles.arrow} aria-hidden="true">←</span>}
          </article>
        ))}
      </div>

      <a className={styles.journey} href="/register">🚀 ابدأ رحلة طفلك الآن</a>
    </section>
  );
}
