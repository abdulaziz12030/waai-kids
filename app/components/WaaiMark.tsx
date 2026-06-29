import styles from "./WaaiMark.module.css";

export default function WaaiMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.mark} ${compact ? styles.compact : ""}`} aria-hidden="true">
      <span className={styles.halo} />
      <span className={styles.letter}>و</span>
      <span className={`${styles.leaf} ${styles.leafPrimary}`} />
      <span className={`${styles.leaf} ${styles.leafSecondary}`} />
      <span className={styles.spark} />
    </span>
  );
}
