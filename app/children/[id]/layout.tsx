"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  return (
    <>
      <nav className="child-route-toolbar" aria-label="تنقل ملف الطفل">
        <Link href={`/children/${studentId}`}>ملف الطفل</Link>
        <Link href={`/children/${studentId}/goals`}>الأهداف</Link>
        <Link className="child-route-primary" href={`/children/${studentId}/goals/new`}>هدف جديد</Link>
      </nav>
      {children}
    </>
  );
}
