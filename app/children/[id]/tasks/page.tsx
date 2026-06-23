"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ChildTasks from "../../../components/ChildTasks";

export default function ChildTasksPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>
      <ChildTasks studentId={studentId} />
    </main>
  );
}
