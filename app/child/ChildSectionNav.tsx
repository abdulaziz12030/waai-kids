"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ChildSectionNav() {
  const pathname = usePathname();

  if (pathname === "/child/login" || pathname === "/child") return null;

  return (
    <nav className="child-section-nav" aria-label="أقسام حساب الطفل">
      <Link href="/child">
        <span>🏠</span>
        <small>الرئيسية</small>
      </Link>
      <Link
        className={pathname.startsWith("/child/quran") ? "active" : ""}
        href="/child/quran"
      >
        <span>📖</span>
        <small>حفظي</small>
      </Link>
      <Link
        className={pathname.startsWith("/child/gifts") ? "active" : ""}
        href="/child/gifts"
      >
        <span>🎁</span>
        <small>هداياي</small>
      </Link>
      <Link
        className={pathname.startsWith("/child/notifications") ? "active" : ""}
        href="/child/notifications"
      >
        <span>🔔</span>
        <small>إشعاراتي</small>
      </Link>
    </nav>
  );
}
