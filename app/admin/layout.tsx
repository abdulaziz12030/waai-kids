import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <nav
        aria-label="أدوات الإدارة السريعة"
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          zIndex: 80,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 6,
          borderRadius: 18,
          background: "rgba(255,255,255,.92)",
          boxShadow: "0 12px 32px rgba(35,58,44,.2)",
          backdropFilter: "blur(14px)"
        }}
      >
        <Link
          href="/admin/accounts"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "#31513e",
            color: "#fff",
            fontWeight: 900,
            fontSize: 12,
            textDecoration: "none"
          }}
        >
          إدارة الحسابات
        </Link>
        <Link
          href="/admin/goals"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "#6651a8",
            color: "#fff",
            fontWeight: 900,
            fontSize: 12,
            textDecoration: "none"
          }}
        >
          إدارة الأهداف
        </Link>
      </nav>
    </>
  );
}
