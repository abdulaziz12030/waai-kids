"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const studentId = params.id;

  const items = [
    ["ملف الطفل", `/children/${studentId}`],
    ["الأهداف", `/children/${studentId}/goals`],
    ["المهام", `/children/${studentId}/tasks`],
    ["الحفظ", `/children/${studentId}/quran`],
    ["التسميع", "/quran/reviews"],
    ["المعلم", `/children/${studentId}/teacher`],
    ["دخول الطفل", `/children/${studentId}/access`]
  ];

  return (
    <>
      <nav className="child-route-toolbar" aria-label="تنقل ملف الطفل">
        {items.map(([label, href]) => (
          <Link className={pathname === href ? "active" : ""} href={href} key={href}>{label}</Link>
        ))}
        <Link className="child-route-primary" href={`/children/${studentId}/goals/new`}>هدف جديد</Link>
      </nav>
      {children}
    </>
  );
}
