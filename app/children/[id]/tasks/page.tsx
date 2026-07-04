"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ChildTasks from "../../../components/ChildTasks";
import UnifiedTaskPlanner from "../../../components/UnifiedTaskPlanner";
import TaskRecognitionPanel from "../../../components/TaskRecognitionPanel";

export default function ChildTasksPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  return (
    <main className="child-profile-page unified-parent-tasks-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">و</span><span>واعي كيدز</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>
      <section className="multiplication-task-entry">
        <div><span>✖️</span><div><strong>مغامرة أبطال جدول الضرب</strong><p>بطاقات تعلم، تحديات تلقائية، مراحل متتابعة وتكريم عند الإتقان.</p></div></div>
        <Link href={`/children/${studentId}/multiplication`}>إسناد ومتابعة البرنامج</Link>
      </section>
      <UnifiedTaskPlanner studentId={studentId} />
      <ChildTasks studentId={studentId} />
      <TaskRecognitionPanel studentId={studentId} />
      <style>{`
        .unified-parent-tasks-page .toggle-task-create-button{display:none!important}
        .multiplication-task-entry{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:20px auto;padding:20px;max-width:1180px;border:1px solid #e4d7a8;border-radius:22px;background:linear-gradient(135deg,#fff8dd,#f2fbf5);box-shadow:0 12px 35px rgba(54,61,43,.07)}
        .multiplication-task-entry>div{display:flex;align-items:center;gap:14px}.multiplication-task-entry>div>span{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#ffe889;font-size:27px}.multiplication-task-entry strong{display:block;font-size:19px}.multiplication-task-entry p{margin:5px 0 0;color:#657067}.multiplication-task-entry a{padding:12px 16px;border-radius:14px;background:#2e6b48;color:#fff;text-decoration:none;font-weight:800;white-space:nowrap}@media(max-width:680px){.multiplication-task-entry{align-items:stretch;flex-direction:column}.multiplication-task-entry a{text-align:center}}
      `}</style>
    </main>
  );
}
