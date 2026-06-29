"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturesMotion.module.css";

type Feature = {
  icon: string;
  title: string;
  description: string;
};

export default function FeaturesMotion({ features }: { features: Feature[] }) {
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
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.grid} ${visible ? styles.visible : ""}`} id="features">
      {features.map((feature, index) => (
        <article
          key={feature.title}
          className={`${styles.card} ${index % 2 === 0 ? styles.fromRight : styles.fromLeft}`}
          style={{ "--delay": `${index * 150}ms` } as React.CSSProperties}
        >
          <span className={styles.decorOne} aria-hidden="true" />
          <span className={styles.decorTwo} aria-hidden="true" />
          <div className={styles.iconWrap}>
            <span className={styles.iconGlow} aria-hidden="true" />
            <span className={styles.icon}>{feature.icon}</span>
          </div>
          <div className={styles.copy}>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
          <span className={styles.shine} aria-hidden="true" />
        </article>
      ))}
    </section>
  );
}
