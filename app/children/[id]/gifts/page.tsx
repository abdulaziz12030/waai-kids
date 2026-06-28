"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import GiftCenter from "../../../components/GiftCenter";

export default function ChildGiftCenterPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  return (
    <div>
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>
      <GiftCenter studentId={studentId} />
    </div>
  );
}
