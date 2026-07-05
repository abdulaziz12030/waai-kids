"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChildMultiplicationProgramsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/child?section=tasks");
  }, [router]);

  return <main className="dashboard-loading">جدول الضرب أصبح داخل مهامي… جارٍ نقلك إلى قائمة المهام.</main>;
}
