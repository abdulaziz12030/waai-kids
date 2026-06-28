import { PreviewGiftLike, GiftMotionType } from "./giftPreviewConfig";
import styles from "./ImmersiveGiftExperience.module.css";

function ArabianHorseArtwork() {
  return (
    <div className={styles.horseWorld} aria-hidden="true">
      <div className={styles.horseGroundShadow} />
      <div className={styles.dustTrail}>{Array.from({ length: 14 }, (_, index) => <span key={index} />)}</div>
      <div className={styles.horseRunner}>
        <svg className={styles.horseSvg} viewBox="0 0 540 320" role="img" aria-label="خيل عربي يعدو">
          <defs>
            <linearGradient id="horseCoatV2" x1="110" y1="55" x2="405" y2="280" gradientUnits="userSpaceOnUse">
              <stop stopColor="#160d09" />
              <stop offset=".34" stopColor="#4a2918" />
              <stop offset=".68" stopColor="#7c4928" />
              <stop offset="1" stopColor="#1a0e0a" />
            </linearGradient>
            <linearGradient id="horseLightV2" x1="150" y1="72" x2="385" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d79a59" stopOpacity=".92" />
              <stop offset=".46" stopColor="#8f552f" stopOpacity=".35" />
              <stop offset="1" stopColor="#30180f" stopOpacity="0" />
            </linearGradient>
            <filter id="horseGlowV2" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#241006" floodOpacity=".52" />
            </filter>
          </defs>
          <g filter="url(#horseGlowV2)">
            <g className={styles.horseTail}>
              <path d="M126 144C76 97 20 111 28 144C3 139-4 169 31 180C5 202 42 224 105 189C141 170 153 151 126 144Z" fill="#140c08" />
              <path d="M128 152C83 135 64 155 89 166C65 174 74 192 115 173" fill="none" stroke="#8e562f" strokeWidth="10" strokeLinecap="round" />
            </g>
            <g className={styles.backLeg}>
              <path d="M181 211C168 241 151 268 126 298L156 303C185 274 204 243 213 207Z" fill="url(#horseCoatV2)" />
              <path d="M127 297L115 311L165 311L156 302Z" fill="#100b08" />
            </g>
            <g className={styles.backLegAlt}>
              <path d="M233 214C232 245 246 272 270 299L300 287C279 260 271 236 271 205Z" fill="url(#horseCoatV2)" />
              <path d="M270 298L267 312L313 303L300 286Z" fill="#100b08" />
            </g>
            <path className={styles.horseBody} d="M132 136C177 93 283 91 352 127C385 144 391 184 356 207C305 240 191 235 141 198C119 181 113 153 132 136Z" fill="url(#horseCoatV2)" />
            <path d="M160 126C215 102 286 105 337 132C289 126 226 139 178 175C157 161 150 141 160 126Z" fill="url(#horseLightV2)" opacity=".82" />
            <path d="M159 190C214 222 302 221 353 196" fill="none" stroke="#9c5a30" strokeWidth="7" strokeLinecap="round" opacity=".42" />
            <g className={styles.frontLeg}>
              <path d="M348 197C361 228 374 258 397 291L426 278C407 244 397 219 392 186Z" fill="url(#horseCoatV2)" />
              <path d="M397 290L398 306L440 288L426 277Z" fill="#100b08" />
            </g>
            <g className={styles.frontLegAlt}>
              <path d="M312 207C304 238 300 269 302 305L331 305C338 268 343 238 354 205Z" fill="url(#horseCoatV2)" />
              <path d="M302 303L295 315L342 315L331 304Z" fill="#100b08" />
            </g>
            <g className={styles.horseNeck}>
              <path d="M335 137C349 96 363 58 398 42C428 28 466 42 480 69C492 92 478 115 452 118C431 121 414 110 405 96C398 131 395 170 369 206Z" fill="url(#horseCoatV2)" />
              <path d="M395 51C373 71 366 107 360 148" fill="none" stroke="#120b08" strokeWidth="18" strokeLinecap="round" />
              <path d="M421 47L411 18L438 38Z" fill="#3c2115" />
              <path d="M454 52L457 22L477 52Z" fill="#3c2115" />
              <path d="M448 69C470 63 504 75 521 89C510 111 482 124 452 115Z" fill="url(#horseCoatV2)" />
              <circle cx="452" cy="63" r="5.5" fill="#f9dc8b" />
              <circle cx="453" cy="62" r="1.8" fill="#fff" />
              <path d="M504 91C514 94 521 96 530 94" stroke="#100b08" strokeWidth="5" strokeLinecap="round" />
              <path d="M478 104C491 105 502 102 512 96" fill="none" stroke="#9a5b34" strokeWidth="3" strokeLinecap="round" />
            </g>
            <path className={styles.horseMane} d="M398 45C370 61 360 88 358 123C375 111 390 94 397 74C400 96 406 113 416 127C420 92 414 63 398 45Z" fill="#100a07" />
            <path d="M182 129C233 111 288 115 329 136" fill="none" stroke="#efb06c" strokeWidth="5" strokeLinecap="round" opacity=".55" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function GenericArtwork({ gift, motion }: { gift: PreviewGiftLike; motion: GiftMotionType }) {
  return (
    <div className={styles.artifactWorld} data-artifact={motion} aria-hidden="true">
      <div className={styles.energyRays}>{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
      <div className={styles.orbitRing}><span /><span /><span /></div>
      <div className={styles.artifactAura} />
      <div className={styles.artifactCore}>
        {motion === "quran-light" ? (
          <div className={styles.openBook}><span>{gift.icon}</span><i /><b /></div>
        ) : motion === "letter-open" ? (
          <div className={styles.letterGift}><span>{gift.icon}</span><i /></div>
        ) : (
          <span className={styles.artifactIcon}>{gift.icon}</span>
        )}
      </div>
      <div className={styles.gemOrbit}>{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
    </div>
  );
}

export default function ImmersiveGiftArtwork({ gift, motion }: { gift: PreviewGiftLike; motion: GiftMotionType }) {
  return motion === "arabian-horse" ? <ArabianHorseArtwork /> : <GenericArtwork gift={gift} motion={motion} />;
}
