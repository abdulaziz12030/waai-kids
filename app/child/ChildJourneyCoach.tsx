"use client";

import { usePathname } from "next/navigation";

export default function ChildJourneyCoach() {
  const pathname = usePathname();
  if (pathname !== "/child") return null;

  return (
    <aside className="child-journey-coach">
      <span>🌤️</span>
      <div>
        <strong>رحلتي اليوم</strong>
        <small>ابدأ بالمهمة الظاهرة الآن فقط.</small>
      </div>
    </aside>
  );
}
