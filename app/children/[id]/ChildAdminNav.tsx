"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ChildAdminNav() {
  const pathname = usePathname();
  const match = pathname.match(/^\/children\/([^/]+)/);
  const id = match?.[1];
  if (!id || id === "new") return null;

  const items = [
    ["ملف الطفل", `/children/${id}`, "👤"],
    ["الأهداف", `/children/${id}/goals`, "🎯"],
    ["المهام", `/children/${id}/tasks`, "✅"],
    ["الحفظ", `/children/${id}/quran`, "📖"],
    ["المعلم", `/children/${id}/teacher`, "👨‍🏫"],
    ["الدخول", `/children/${id}/access`, "🔐"]
  ];

  return (
    <nav className="child-admin-nav" aria-label="إدارة الطفل">
      {items.map(([label, href, icon]) => (
        <Link className={pathname === href ? "active" : ""} href={href} key={href}><span>{icon}</span><small>{label}</small></Link>
      ))}
    </nav>
  );
}
