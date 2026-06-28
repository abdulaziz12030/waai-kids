export type GiftMotionType =
  | "arabian-horse"
  | "crown-drop"
  | "shield-shine"
  | "quran-light"
  | "medal-spin"
  | "warm-hearts"
  | "star-burst"
  | "letter-open"
  | "gift-float";

export type GiftEffectLevel = "calm" | "medium" | "celebration";

export type GiftPreviewConfig = {
  motionType: GiftMotionType;
  background: string;
  durationMs: number;
  audioKey: "arabian-horse" | null;
  volume: number;
  effects: GiftEffectLevel;
  greeting: string;
  revealText: string;
};

export type PreviewGiftLike = {
  code: string;
  name: string;
  description?: string;
  icon: string;
  tier?: string;
  coin_price?: number;
  sar_price?: number;
  animation_key: string;
  sound_key?: string | null;
  certificate_title?: string;
};

const previewConfigs: Record<string, GiftPreviewConfig> = {
  arabian_horse: {
    motionType: "arabian-horse",
    background: "desert-gold",
    durationMs: 8000,
    audioKey: "arabian-horse",
    volume: 0.34,
    effects: "celebration",
    greeting: "أحسنت يا {child}",
    revealText: "أُهديت لك هدية الخيل العربي"
  },
  crown_burst: {
    motionType: "crown-drop",
    background: "royal-gold",
    durationMs: 6500,
    audioKey: null,
    volume: 0.24,
    effects: "celebration",
    greeting: "تألّقت يا {child}",
    revealText: "أُهدي لك تاج الإنجاز"
  },
  shield_glow: {
    motionType: "shield-shine",
    background: "emerald-night",
    durationMs: 6500,
    audioKey: null,
    volume: 0.24,
    effects: "medium",
    greeting: "أبدعت يا {child}",
    revealText: "أُهدي لك درع المتقنين"
  },
  quran_light: {
    motionType: "quran-light",
    background: "quran-calm",
    durationMs: 7000,
    audioKey: null,
    volume: 0.2,
    effects: "calm",
    greeting: "بارك الله فيك يا {child}",
    revealText: "أُهدي لك المصحف المضيء"
  },
  perseverance_medal: {
    motionType: "medal-spin",
    background: "sky-gold",
    durationMs: 6000,
    audioKey: null,
    volume: 0.22,
    effects: "medium",
    greeting: "واصل تميّزك يا {child}",
    revealText: "أُهدي لك وسام المثابرة"
  },
  parents_medal: {
    motionType: "warm-hearts",
    background: "warm-rose",
    durationMs: 6200,
    audioKey: null,
    volume: 0.2,
    effects: "calm",
    greeting: "زادك الله برًا يا {child}",
    revealText: "أُهدي لك وسام بر الوالدين"
  },
  star_burst: {
    motionType: "star-burst",
    background: "colorful-night",
    durationMs: 5800,
    audioKey: null,
    volume: 0.22,
    effects: "celebration",
    greeting: "أنت نجم يا {child}",
    revealText: "أُهديت لك نجمة الإنجاز"
  },
  thank_letter: {
    motionType: "letter-open",
    background: "paper-green",
    durationMs: 6200,
    audioKey: null,
    volume: 0.18,
    effects: "calm",
    greeting: "شكرًا لاجتهادك يا {child}",
    revealText: "وصل إليك خطاب شكر وتقدير"
  }
};

const aliases: Array<{ match: RegExp; key: keyof typeof previewConfigs }> = [
  { match: /خيل|حصان|horse/i, key: "arabian_horse" },
  { match: /تاج|crown/i, key: "crown_burst" },
  { match: /درع|shield/i, key: "shield_glow" },
  { match: /مصحف|قرآن|quran/i, key: "quran_light" },
  { match: /مثابر|medal|وسام/i, key: "perseverance_medal" },
  { match: /والدين|بر/i, key: "parents_medal" },
  { match: /نجمة|star/i, key: "star_burst" },
  { match: /خطاب|رسالة|شكر|letter/i, key: "thank_letter" }
];

const fallbackConfig: GiftPreviewConfig = {
  motionType: "gift-float",
  background: "waai-green",
  durationMs: 6000,
  audioKey: null,
  volume: 0.2,
  effects: "medium",
  greeting: "أحسنت يا {child}",
  revealText: "وصلتك هدية إنجاز جميلة"
};

export function getGiftPreviewConfig(gift: PreviewGiftLike): GiftPreviewConfig {
  const exact = previewConfigs[gift.animation_key];
  if (exact) return exact;

  const searchable = `${gift.animation_key} ${gift.code} ${gift.name}`;
  const alias = aliases.find((item) => item.match.test(searchable));
  return alias ? previewConfigs[alias.key] : fallbackConfig;
}

export function interpolateGiftText(value: string, childName: string) {
  return value.replaceAll("{child}", childName);
}
