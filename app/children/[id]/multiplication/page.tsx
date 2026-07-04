"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import MultiplicationAssignmentPanel from "../../../components/MultiplicationAssignmentPanel";

export default function ParentMultiplicationPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">و</span><span>واعي كيدز</span></Link>
        <div className="dashboard-header-actions">
          <Link className="quiet-button link-submit" href={`/children/${studentId}/tasks`}>العودة إلى المهام</Link>
          <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
        </div>
      </header>
      <MultiplicationAssignmentPanel studentId={studentId} />
    </main>
  );
}
