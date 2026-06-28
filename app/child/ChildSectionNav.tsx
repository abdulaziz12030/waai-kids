"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ChildSectionNav() {
  const pathname = usePathname();
  if (pathname === "/child/login") return null;

  return (
    <nav className="child-section-nav" aria-label="أقسام حساب الطفل">
      <Link className={pathname === "/child" ? "active" : ""} href="/child"><span>🏠</span><small>حسابي</small></Link>
      <Link className={pathname.startsWith("/child/quran") ? "active" : ""} href="/child/quran"><span>📖</span><small>الحفظ</small></Link>
      <Link className={pathname.startsWith("/child/gifts") ? "active" : ""} href="/child/gifts"><span>🎁</span><small>هداياي</small></Link>
    </nav>
  );
}
