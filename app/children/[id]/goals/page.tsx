"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ChildGoals from "../../../components/ChildGoals";
import GoalDeletionManager from "../../../components/GoalDeletionManager";
import GoalQuranFormBridge from "../../../components/GoalQuranFormBridge";
import GoalQuranTaskPlanner from "../../../components/GoalQuranTaskPlanner";

export default function ChildGoalsPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">و</span>
          <span>واعي كيدز</span>
        </Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>

      <GoalQuranFormBridge />
      <GoalQuranTaskPlanner studentId={studentId} />
      <GoalDeletionManager studentId={studentId} />
      <ChildGoals studentId={studentId} />
    </main>
  );
}
