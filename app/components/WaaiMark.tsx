import styles from "./WaaiMark.module.css";

export default function WaaiMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.mark} ${compact ? styles.compact : ""}`} aria-hidden="true">
      <svg className={styles.symbol} viewBox="0 0 120 120" role="img">
        <defs>
          <linearGradient id="waai-path" x1="20" y1="95" x2="98" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#174d39" />
            <stop offset="0.56" stopColor="#23875a" />
            <stop offset="1" stopColor="#49b875" />
          </linearGradient>
          <linearGradient id="waai-leaf" x1="72" y1="35" x2="101" y2="8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#35a86a" />
            <stop offset="1" stopColor="#82d991" />
          </linearGradient>
          <linearGradient id="waai-star" x1="23" y1="22" x2="39" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffd86a" />
            <stop offset="1" stopColor="#e8a91f" />
          </linearGradient>
          <filter id="waai-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#184c37" floodOpacity="0.2" />
          </filter>
        </defs>

        <circle className={styles.aura} cx="60" cy="61" r="47" />

        <path
          className={styles.waawPath}
          d="M88 31C74 27 59 31 49 41C38 51 34 65 39 76C44 88 57 94 69 91C83 88 92 76 91 63C90 52 82 44 72 43C63 42 56 47 55 55C54 62 59 67 66 68C74 69 81 64 85 57C90 48 91 39 88 31Z"
          fill="none"
          stroke="url(#waai-path)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#waai-shadow)"
        />

        <path className={styles.growthStem} d="M87 35C88 25 91 19 97 14" fill="none" stroke="#2f9e64" strokeWidth="4" strokeLinecap="round" />
        <path className={`${styles.leaf} ${styles.leafOne}`} d="M95 18C97 7 105 3 114 4C113 13 108 20 98 22C96 22 95 21 95 18Z" fill="url(#waai-leaf)" />
        <path className={`${styles.leaf} ${styles.leafTwo}`} d="M91 24C84 16 84 8 89 2C97 7 100 14 96 22C95 25 93 26 91 24Z" fill="url(#waai-leaf)" />

        <path
          className={styles.progressPath}
          d="M43 82C32 77 25 68 23 57C21 47 24 38 30 31"
          fill="none"
          stroke="#d7eadf"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 8"
        />

        <path
          className={styles.star}
          d="M29 20L31.7 25.4L37.7 26.3L33.4 30.5L34.4 36.5L29 33.7L23.6 36.5L24.6 30.5L20.3 26.3L26.3 25.4L29 20Z"
          fill="url(#waai-star)"
        />
        <circle className={styles.spark} cx="45" cy="25" r="2.4" />
      </svg>
    </span>
  );
}
