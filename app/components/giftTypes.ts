export type CatalogGift = {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: "included" | "premium";
  icon: string;
  coin_price: number;
  sar_price: number;
  animation_key: string;
  certificate_title: string;
};

export type GoalOption = { id: string; title: string; status: string; progress: number };
export type TaskOption = { id: string; goal_id: string | null; title: string; description: string | null; approved_at: string | null };
export type CoinPackage = { id: string; code: string; name: string; coins: number; bonus_coins: number; price_sar: number };

export type RecentGift = {
  id: string;
  achievement_title: string;
  reason: string | null;
  status: string;
  gifted_at: string;
  certificate_number: string;
  sender_name?: string;
  gift: Pick<CatalogGift, "code" | "name" | "icon" | "tier" | "animation_key" | "certificate_title">;
};

export type GiftCenterData = {
  student: { id: string; full_name: string };
  wallet: { coin_balance: number; included_monthly_limit: number; included_used: number; included_remaining: number };
  catalog: CatalogGift[];
  coin_packages: CoinPackage[];
  goals: GoalOption[];
  tasks: TaskOption[];
  recent_gifts: RecentGift[];
};

export function formatGiftDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export function giftError(message?: string) {
  if (!message) return "تعذر إرسال الهدية الآن.";
  if (message.includes("رصيد الكوينز")) return "رصيد الكوينز غير كافٍ. اختر هدية مشمولة أو اشحن المحفظة بعد تفعيل الدفع.";
  if (message.includes("انتهى رصيد الهدايا")) return "استخدمت جميع الهدايا المشمولة لهذا الشهر.";
  if (message.includes("قبل اكتماله")) return "لا يمكن إهداء مكافأة الهدف الكامل قبل اكتماله.";
  if (message.includes("قبل اعتماده")) return "لا يمكن تكريم الجزء قبل اعتماده من ولي الأمر.";
  return message;
}
