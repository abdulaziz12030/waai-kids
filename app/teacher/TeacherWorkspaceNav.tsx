"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TeacherWorkspaceNavProps = {
  studentId?: string;
};

export default function TeacherWorkspaceNav({ studentId }: TeacherWorkspaceNavProps) {
  const pathname = usePathname();
  const items = [
    {
      href: "/teacher",
      icon: "⌂",
      label: "لوحة المعلم",
      active: pathname === "/teacher"
    },
    {
      href: studentId ? `/teacher/students/${studentId}/quran` : "/teacher#teacher-students",
      icon: "📖",
      label: studentId ? "إدارة الحفظ" : "طلابي",
      active: pathname.startsWith("/teacher/students/")
    },
    {
      href: "/teacher/multiplication",
      icon: "✖️",
      label: "جدول الضرب",
      active: pathname === "/teacher/multiplication"
    },
    {
      href: "/teacher/quran/reviews",
      icon: "🎙️",
      label: "مركز التسميع",
      active: pathname === "/teacher/quran/reviews"
    }
  ];

  return (
    <nav className="teacher-workspace-nav" aria-label="التنقل في حساب المعلم">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={item.active ? "active" : ""}
          aria-current={item.active ? "page" : undefined}
        >
          <span>{item.icon}</span>
          <strong>{item.label}</strong>
        </Link>
      ))}
    </nav>
  );
}
