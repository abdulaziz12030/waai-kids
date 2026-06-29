"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./FeaturesMotion.module.css";
import interactiveStyles from "./FeaturesInteractive.module.css";

type Feature = {
  icon: string;
  title: string;
  description: string;
};

function updatePointerMotion(event: ReactPointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const relativeX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const relativeY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  const dragX = (relativeX - 0.5) * 14;
  const dragY = (relativeY - 0.5) * 8;
  const tiltX = (0.5 - relativeY) * 4;
  const tiltY = (relativeX - 0.5) * 4;

  card.style.setProperty("--drag-x", `${dragX.toFixed(2)}px`);
  card.style.setProperty("--drag-y", `${dragY.toFixed(2)}px`);
  card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
  card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
  card.style.setProperty("--pointer-x", `${(relativeX * 100).toFixed(1)}%`);
  card.style.setProperty("--pointer-y", `${(relativeY * 100).toFixed(1)}%`);
}

function resetPointerMotion(card: HTMLElement) {
  card.style.setProperty("--drag-x", "0px");
  card.style.setProperty("--drag-y", "0px");
  card.style.setProperty("--tilt-x", "0deg");
  card.style.setProperty("--tilt-y", "0deg");
  card.dataset.pressed = "false";
}

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
      { threshold: 0.02, rootMargin: "0px 0px 22% 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles.grid} ${visible ? `${styles.visible} ${interactiveStyles.visibleGrid}` : ""}`}
      id="features"
    >
      {features.map((feature, index) => (
        <article
          key={feature.title}
          className={`${styles.card} ${interactiveStyles.interactiveCard} ${index % 2 === 0 ? styles.fromRight : styles.fromLeft}`}
          style={{
            "--delay": `${index * 85}ms`,
            "--enter-x": index % 2 === 0 ? "72px" : "-72px"
          } as CSSProperties}
          onPointerEnter={updatePointerMotion}
          onPointerMove={updatePointerMotion}
          onPointerDown={(event) => {
            event.currentTarget.dataset.pressed = "true";
            updatePointerMotion(event);
          }}
          onPointerUp={(event) => resetPointerMotion(event.currentTarget)}
          onPointerCancel={(event) => resetPointerMotion(event.currentTarget)}
          onPointerLeave={(event) => resetPointerMotion(event.currentTarget)}
        >
          <span className={styles.decorOne} aria-hidden="true" />
          <span className={styles.decorTwo} aria-hidden="true" />
          <div className={`${styles.iconWrap} ${interactiveStyles.interactiveIcon}`}>
            <span className={styles.iconGlow} aria-hidden="true" />
            <span className={styles.icon}>{feature.icon}</span>
          </div>
          <div className={styles.copy}>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
          <span className={`${styles.shine} ${interactiveStyles.interactiveShine}`} aria-hidden="true" />
        </article>
      ))}
    </section>
  );
}
