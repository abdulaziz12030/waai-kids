"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";


type QuranPlan = {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  daily_target: number;
  source_name: string;
  surah_number: number | null;
  duration_days: number | null;
  segments_count: number;
  assigned_count: number;
  waiting_count: number;
  revision_count: number;
  mastered_count: number;
};

type QuranSegment = {
  id: string;
  plan_id: string;
  portion_label: string | null;
  readable_text: string | null;
  status: string;
  achievement_points: number;
  scheduled_date: string | null;
  day_number: number | null;
  latest_mistakes_count: number | null;
  latest_fluency_score: number | null;
  latest_tajweed_score: number | null;
  latest_review_notes: string | null;
  latest_reviewed_at: string | null;
};

type TeacherLink = {
  id: string;
  teacher_name: string;
  status: string;
};

const statusLabels: Record<string, string> = {
  assigned: "بانتظار الحفظ",
  memorized: "أرسل للتسميع",
  recited: "قيد اعتماد المعلم",
  mastered: "متقن ومعتمد",
  needs_revision: "أعيد للتصحيح"
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export default function ParentQuranSupervisionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [studentName, setStudentName] = useState("");
  const [plans, setPlans] = useState<QuranPlan[]>([]);
  const [segments, setSegments] = useState<QuranSegment[]>([]);
  const [teacherLinks, setTeacherLinks] = useState<TeacherLink[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSegments(planId: string) {
    const client = supabase;
    if (!client || !planId) {
      setSegments([]);
      return;
    }
    const result = await client.rpc("get_quran_plan_segments_shared", { p_plan_id: planId });
    if (result.error) setError("تعذر تحميل تفاصيل خطة الحفظ.");
    else setSegments((result.data || []) as QuranSegment[]);
  }

  async function loadData() {
    const client = supabase;
    if (!client) return;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }

    const [studentResult, plansResult, linksResult] = await Promise.all([
      client.from("students").select("full_name").eq("id", studentId).maybeSingle(),
      client.rpc("get_student_quran_plans_shared", { p_student_id: studentId }),
      client.rpc("get_student_teacher_links", { p_student_id: studentId })
    ]);

    if (studentResult.data) setStudentName(studentResult.data.full_name);
    if (plansResult.error) {
      setError("تعذر تحميل خطط الحفظ.");
    } else {
      const loadedPlans = (plansResult.data || []) as QuranPlan[];
      setPlans(loadedPlans);
      const planId = loadedPlans.some((plan) => plan.id === selectedPlanId)
        ? selectedPlanId
        : loadedPlans[0]?.id || "";
      setSelectedPlanId(planId);
      await loadSegments(planId);
    }
    if (!linksResult.error) setTeacherLinks((linksResult.data || []) as TeacherLink[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [studentId]);

  useEffect(() => {
    if (selectedPlanId) loadSegments(selectedPlanId);
  }, [selectedPlanId]);

  const activeTeacher = teacherLinks.find((link) => link.status === "active");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || null;
  const totalSegments = plans.reduce((sum, plan) => sum + Number(plan.segments_count || 0), 0);
  const masteredSegments = plans.reduce((sum, plan) => sum + Number(plan.mastered_count || 0), 0);
  const waitingSegments = plans.reduce((sum, plan) => sum + Number(plan.waiting_count || 0), 0);
  const revisionSegments = plans.reduce((sum, plan) => sum + Number(plan.revision_count || 0), 0);
  const progress = selectedPlan?.segments_count
    ? Math.round((selectedPlan.mastered_count / selectedPlan.segments_count) * 100)
    : 0;

  const sortedSegments = useMemo(
    () => [...segments].sort((a, b) => (a.day_number || 9999) - (b.day_number || 9999)),
    [segments]
  );

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز متابعة الحفظ...</main>;

  return (
    <main className="quran-program-page parent-quran-supervision-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
      </header>

      <section className="quran-program-hero parent-supervision-hero">
        <div className="quran-hero-copy">
          <span className="section-label">👁️ متابعة ولي الأمر</span>
          <h1>متابعة حفظ {studentName || "الطفل"}</h1>
          <p>هذه الصفحة إشرافية لعرض الخطة والتقدم ونتائج المعلم. إنشاء الخطط والتقييم والاعتماد والتصحيح من صلاحيات المعلم.</p>
        </div>
        <div className="quran-hero-icon">📊</div>
      </section>

      {error && <p className="form-message error-message">{error}</p>}

      <section className={`parent-teacher-supervision-card ${activeTeacher ? "linked" : "unlinked"}`}>
        <span>{activeTeacher ? "👨‍🏫" : "🔗"}</span>
        <div>
          <strong>{activeTeacher ? `المعلم المسؤول: ${activeTeacher.teacher_name}` : "لا يوجد معلم مرتبط بالطالب"}</strong>
          <p>{activeTeacher ? "المعلم يدير خطط الحفظ ويقيّم التسميع ويعتمد الإتقان أو يعيد المقطع للتصحيح." : "يلزم تفويض معلم حتى يتمكن من إنشاء خطة الحفظ ومتابعة التسميع واعتماده."}</p>
        </div>
        <Link href={`/children/${studentId}/teacher`}>{activeTeacher ? "إدارة التفويض" : "تفويض معلم"}</Link>
      </section>

      <section className="parent-quran-summary-grid">
        <article><span>📚</span><div><strong>{plans.length}</strong><small>خطط الحفظ</small></div></article>
        <article><span>📖</span><div><strong>{totalSegments}</strong><small>إجمالي المقاطع</small></div></article>
        <article><span>⏳</span><div><strong>{waitingSegments}</strong><small>بانتظار المعلم</small></div></article>
        <article><span>🔄</span><div><strong>{revisionSegments}</strong><small>للتصحيح</small></div></article>
        <article><span>✅</span><div><strong>{masteredSegments}</strong><small>متقنة ومعتمدة</small></div></article>
      </section>

      <section className="quran-plan-manager-card parent-plan-viewer">
        <div><span className="section-label">الخطط الحالية</span><h2>اختر خطة لمتابعة تفاصيلها</h2></div>
        {plans.length === 0 ? (
          <div className="quran-empty-state"><span>📘</span><h3>لا توجد خطة حفظ بعد</h3><p>{activeTeacher ? "يمكن للمعلم إنشاء أول خطة من حسابه." : "ابدأ بتفويض معلم للطالب."}</p></div>
        ) : (
          <div className="quran-plan-control-list">
            {plans.map((plan) => (
              <article key={plan.id} className={selectedPlanId === plan.id ? "active" : ""}>
                <button type="button" onClick={() => setSelectedPlanId(plan.id)}>
                  <span>📘</span>
                  <div><strong>{plan.title}</strong><small>{plan.mastered_count} من {plan.segments_count} متقنة · ينتهي {formatDate(plan.due_date)}</small></div>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedPlan && (
        <>
          <section className="parent-plan-progress-card">
            <div><span className="section-label">تقدم البرنامج</span><h2>{selectedPlan.title}</h2><p>{selectedPlan.duration_days || "—"} يومًا · بمعدل {selectedPlan.daily_target || "—"} آيات يوميًا</p></div>
            <div className="parent-progress-number"><strong>{progress}%</strong><small>نسبة الإتقان</small></div>
            <div className="parent-progress-track"><span style={{ width: `${progress}%` }} /></div>
          </section>

          <section className="quran-plans-card quran-full-card">
            <div className="quran-card-head"><div><span className="section-label">الجدول اليومي</span><h2>المقاطع ونتائج المعلم</h2></div><span>{segments.length}</span></div>
            {sortedSegments.length === 0 ? (
              <div className="quran-empty-state"><span>📖</span><h3>لا توجد مقاطع</h3></div>
            ) : (
              <div className="quran-segments-grid parent-segments-readonly">
                {sortedSegments.map((segment) => (
                  <article className={`quran-segment-card status-${segment.status}`} key={segment.id}>
                    <div className="quran-plan-item-head">
                      <div><span className="quran-plan-status">{statusLabels[segment.status] || segment.status}</span><h3>{segment.portion_label}</h3>{segment.scheduled_date && <small>📅 {formatDate(segment.scheduled_date)}</small>}</div>
                      <strong>{segment.achievement_points} ⭐</strong>
                    </div>
                    {segment.readable_text && <p className="quran-readable-text">{segment.readable_text}</p>}
                    {segment.latest_reviewed_at && (
                      <div className="parent-teacher-result-inline">
                        <strong>آخر تقييم للمعلم</strong>
                        <div><span>الأخطاء: {segment.latest_mistakes_count ?? 0}</span><span>الطلاقة: {segment.latest_fluency_score ?? "—"}</span><span>التجويد: {segment.latest_tajweed_score ?? "—"}</span></div>
                        {segment.latest_review_notes && <p>{segment.latest_review_notes}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="future-parent-rewards-card">
        <span>🎁</span>
        <div><strong>المكافآت والهدايا وسجل الإنجازات</strong><p>سيُتاح لولي الأمر لاحقًا مكافأة الطفل بعد إتمام البرنامج أو المهام، وإهداؤه هدية أو شهادة شكر تُضاف إلى سجل إنجازاته.</p></div>
        <small>قريبًا</small>
      </section>
    </main>
  );
}
