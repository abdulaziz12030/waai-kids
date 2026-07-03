"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ChildTasks from "../../../components/ChildTasks";
import QuranTaskFormBridge from "../../../components/QuranTaskFormBridge";
import QuranTaskPlanner from "../../../components/QuranTaskPlanner";
import TaskRecognitionPanel from "../../../components/TaskRecognitionPanel";

export default function ChildTasksPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">و</span><span>واعي كيدز</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>
      <QuranTaskFormBridge />
      <QuranTaskPlanner studentId={studentId} />
      <ChildTasks studentId={studentId} />
      <TaskRecognitionPanel studentId={studentId} />
    </main>
  );
}
