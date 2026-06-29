"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HeroCopyMotion.module.css";
import textStyles from "./HeroTextMobile.module.css";

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

  return (
    <div ref={ref} className={`namaa-hero-copy ${styles.copy} ${visible ? styles.visible : ""}`}>
      <span className={styles.eyebrow}>💚 منصة تربوية ذكية للأسرة والطفل والمعلم</span>

      <h1 className={`${styles.title} ${textStyles.titleBalance}`}>
        <span>نزرع الوعي</span>
        <span>ونحوّل <em>الأهداف</em> إلى</span>
        <strong>إنجاز</strong>
      </h1>

      <p className={`${styles.description} ${textStyles.detailText}`}>
        واعي كيدز منصة تربوية ذكية تساعد الأسرة والمعلم على تنمية <span className={textStyles.keyword}>وعي الطفل</span>، وبناء عاداته الإيجابية، وتحقيق <span className={textStyles.keyword}>أهدافه</span>، ومتابعة حفظه <span className={textStyles.keyword}>للقرآن</span>، وتحفيزه <span className={textStyles.keyword}>بالمكافآت والهدايا الهادفة</span>.
      </p>

      <div className={styles.entries}>
        <a className={`${styles.entry} ${styles.parent}`} href="/login?type=family">
          <span className={styles.entryIcon}>👤</span>
          <span className={styles.entryText}><strong>دخول ولي الأمر</strong><small>إدارة ومتابعة الأبناء</small></span>
          <span className={styles.entryArrow}>←</span>
        </a>

        <a className={`${styles.entry} ${styles.child}`} href="/child/login">
          <span className={styles.entryIcon}>🧒🏻</span>
          <span className={styles.entryText}><strong>دخول الطفل</strong><small>إنجاز المهام وكسب النقاط</small></span>
          <span className={styles.entryArrow}>←</span>
        </a>

        <a className={`${styles.entry} ${styles.teacher}`} href="/login?type=teacher">
          <span className={styles.entryIcon}>👨‍🏫</span>
          <span className={styles.entryText}><strong>دخول المعلم</strong><small>إدارة الحفظ ومركز التسميع</small></span>
          <span className={styles.entryArrow}>←</span>
        </a>
      </div>

      <div className={styles.security}>🔒 بياناتك آمنة ومشفرة</div>
    </div>
  );
}
