import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Link
        href="/admin/accounts"
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          zIndex: 80,
          padding: "11px 16px",
          borderRadius: 14,
          background: "#31513e",
          color: "#fff",
          fontWeight: 900,
          fontSize: 13,
          textDecoration: "none",
          boxShadow: "0 12px 32px rgba(35, 58, 44, .24)"
        }}
      >
        إدارة الحسابات
      </Link>
    </>
  );
}
