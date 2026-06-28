export type ChildGift = {
  id: string;
  achievement_type: string;
  achievement_title: string;
  reason: string | null;
  sender_name: string;
  status: "delivered" | "opened";
  gifted_at: string;
  opened_at: string | null;
  certificate_number: string;
  gift: {
    code: string;
    name: string;
    description: string;
    icon: string;
    tier: string;
    animation_key: string;
    sound_key: string | null;
    certificate_title: string;
  };
};

export type GiftData = { student: { id: string; full_name: string }; gifts: ChildGift[] };

export function formatGiftDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
