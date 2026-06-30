"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TeacherSciencesShortcut() {
  const pathname = usePathname();
  const match = pathname.match(/^\/teacher\/students\/([^/]+)\/quran$/);
  if (!match) return null;

  return (
    <aside className="teacher-sciences-shortcut" aria-label="الانتقال إلى العلوم الدينية">
      <span>📚</span>
      <div><strong>العلوم الدينية والمتون</strong><small>أنشئ برنامجًا مقسمًا تلقائيًا لهذا الطالب.</small></div>
      <Link href={`/teacher/students/${match[1]}/religious-sciences`}>فتح القسم</Link>
    </aside>
  );
}
