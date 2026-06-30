"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MemorizationPlanBuilder from "../../../components/MemorizationPlanBuilder";
import QuranPlanDeleteControls from "../../../components/QuranPlanDeleteControls";
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

type ParentSegmentFilter = "current" | "revision" | "mastered" | "all";

const statusLabels: Record<string, string> = {
  assigned: "بانتظار الحفظ",
  memorized: "أرسل للتسميع",
  recited: "قيد اعتماد المعلم",
  mastered: "متقن ومعتمد",
  needs_revision: "أعيد للتصحيح"
};

function localToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function isFutureAssigned(segment: QuranSegment, today: string) {
  return segment.status === "assigned" && Boolean(segment.scheduled_date && segment.scheduled_date > today);
}

export default function ParentQuranSupervisionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const today = localToday();
  const [studentName, setStudentName] = useState("");
  const [plans, setPlans] = useState<QuranPlan[]>([]);
  const [segments, setSegments] = useState<QuranSegment[]>([]);
  const [teacherLinks, setTeacherLinks] = useState<TeacherLink[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<ParentSegmentFilter>("current");
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
  const revisionSegmentsCount = plans.reduce((sum, plan) => sum + Number(plan.revision_count || 0), 0);
  const progress = selectedPlan?.segments_count
    ? Math.round((selectedPlan.mastered_count / selectedPlan.segments_count) * 100)
    : 0;

  const sortedSegments = useMemo(
    () => [...segments].sort((a, b) => (a.day_number || 9999) - (b.day_number || 9999)),
    [segments]
  );

  const upcomingSegments = useMemo(
    () => sortedSegments.filter((segment) => isFutureAssigned(segment, today)),
    [sortedSegments, today]
  );

  const currentSegments = useMemo(
    () => sortedSegments.filter((segment) => !isFutureAssigned(segment, today) && !["mastered", "needs_revision"].includes(segment.status)),
    [sortedSegments, today]
  );

  const revisionSegments = useMemo(
    () => sortedSegments.filter((segment) => segment.status === "needs_revision"),
    [sortedSegments]
  );

  const completedSegments = useMemo(
    () => [...sortedSegments].filter((segment) => segment.status === "mastered").reverse(),
    [sortedSegments]
  );

  const visibleSegments = useMemo(() => {
    if (segmentFilter === "current") return currentSegments;
    if (segmentFilter === "revision") return revisionSegments;
    if (segmentFilter === "mastered") return completedSegments;
    return [...currentSegments, ...revisionSegments, ...completedSegments];
  }, [segmentFilter, currentSegments, revisionSegments, completedSegments]);

  function renderSegment(segment: QuranSegment, index: number) {
    const isToday = segment.scheduled_date === today;
    const isOpenByDefault = segmentFilter === "current" && (isToday || index === 0);
    return (
      <details className={`quran-segment-accordion parent-segment-accordion status-${segment.status}`} key={segment.id} open={isOpenByDefault}>
        <summary>
          <div className="segment-summary-main">
            <span className="segment-day-badge">{segment.day_number ? `اليوم ${segment.day_number}` : "مقطع"}</span>
            <div>
              <strong>{segment.portion_label}</strong>
              <small>{segment.scheduled_date ? formatDate(segment.scheduled_date) : "دون تاريخ"}</small>
            </div>
          </div>
          <div className="segment-summary-side">
            <span className="quran-plan-status">{statusLabels[segment.status] || segment.status}</span>
            <b>{segment.achievement_points} ⭐</b>
            <span className="segment-chevron">⌄</span>
          </div>
        </summary>
        <div className="segment-accordion-body">
          {segment.readable_text && <p className="quran-readable-text">{segment.readable_text}</p>}
          {segment.latest_reviewed_at ? (
            <div className="parent-teacher-result-inline">
              <strong>آخر تقييم للمعلم</strong>
              <div>
                <span>الأخطاء: {segment.latest_mistakes_count ?? 0}</span>
                <span>الطلاقة: {segment.latest_fluency_score ?? "—"}</span>
                <span>التجويد: {segment.latest_tajweed_score ?? "—"}</span>
              </div>
              {segment.latest_review_notes && <p>{segment.latest_review_notes}</p>}
            </div>
          ) : (
            <div className="parent-observation-note">
              <span>👁️</span>
              <p>{segment.status === "assigned" ? "لم يرسل الطفل هذا المقطع للتسميع بعد." : "المقطع لدى المعلم الآن، ولا يلزم من ولي الأمر إجراء."}</p>
            </div>
          )}
        </div>
      </details>
    );
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز متابعة الحفظ...</main>;

  return (
    <main className="quran-program-page parent-quran-supervision-page parent-role-theme">
      <header className="dashboard-header role-aware-header parent-role-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <div className="role-header-actions">
          <span className="role-identity-badge parent"><b>ولي الأمر</b><small>متابعة وإنشاء</small></span>
          <Link className="quiet-button link-submit" href={`/children/${studentId}`}>ملف الطفل</Link>
        </div>
      </header>

      <section className="quran-program-hero parent-supervision-hero role-distinct-hero">
        <div className="quran-hero-copy">
          <span className="section-label">👨‍👩‍👦 لوحة ولي الأمر</span>
          <h1>برامج حفظ {studentName || "الطفل"}</h1>
          <p>أنشئ برنامج قرآن أو متنًا دينيًا، ثم تابع التقدم ونتائج التسميع من مكان واحد.</p>
          <div className="role-scope-strip"><span>إنشاء الخطة</span><span>تقسيم تلقائي</span><span>متابعة التقدم</span><span>إعادة البدء</span></div>
        </div>
        <div className="quran-hero-icon">🧭</div>
      </section>

      {error && <p className="form-message error-message">{error}</p>}

      <MemorizationPlanBuilder
        studentId={studentId}
        role="parent"
        studentName={studentName || "الطفل"}
        onCreated={async () => {
          setSelectedPlanId("");
          await loadData();
        }}
      />

      <section className={`parent-teacher-supervision-card ${activeTeacher ? "linked" : "unlinked"}`}>
        <span>{activeTeacher ? "👨‍🏫" : "🔗"}</span>
        <div>
          <strong>{activeTeacher ? `المعلم المسؤول: ${activeTeacher.teacher_name}` : "لا يوجد معلم مرتبط بالطالب"}</strong>
          <p>{activeTeacher ? "يمكن لولي الأمر والمعلم إنشاء البرامج، ويتولى المعلم التقييم العلمي للتسميع." : "يمكنك إنشاء البرنامج ومتابعته، كما تستطيع تفويض معلم للتقييم المهني."}</p>
        </div>
        <Link href={`/children/${studentId}/teacher`}>{activeTeacher ? "إدارة التفويض" : "تفويض معلم"}</Link>
      </section>

      <section className="parent-quran-summary-grid">
        <article><span>📚</span><div><strong>{plans.length}</strong><small>برامج الحفظ</small></div></article>
        <article><span>📖</span><div><strong>{totalSegments}</strong><small>إجمالي المقاطع</small></div></article>
        <article><span>⏳</span><div><strong>{waitingSegments}</strong><small>بانتظار المراجعة</small></div></article>
        <article><span>🔄</span><div><strong>{revisionSegmentsCount}</strong><small>للتصحيح</small></div></article>
        <article><span>✅</span><div><strong>{masteredSegments}</strong><small>متقنة ومعتمدة</small></div></article>
      </section>

      <section className="quran-plan-manager-card parent-plan-viewer">
        <div className="quran-plan-manager-title">
          <div><span className="section-label">الخطط الحالية</span><h2>اختر برنامجًا لمتابعة تفاصيله</h2></div>
          <QuranPlanDeleteControls
            studentId={studentId}
            studentName={studentName || "الطفل"}
            selectedPlan={selectedPlan ? { id: selectedPlan.id, title: selectedPlan.title } : null}
            planCount={plans.length}
            onChanged={async () => {
              setSelectedPlanId("");
              setSegments([]);
              await loadData();
            }}
          />
        </div>
        {plans.length === 0 ? (
          <div className="quran-empty-state"><span>📘</span><h3>لا توجد خطة حفظ بعد</h3><p>استخدم نموذج الإنشاء أعلاه لإضافة أول برنامج.</p></div>
        ) : (
          <div className="quran-plan-control-list">
            {plans.map((plan) => (
              <article key={plan.id} className={selectedPlanId === plan.id ? "active" : ""}>
                <button type="button" onClick={() => setSelectedPlanId(plan.id)}>
                  <span>{plan.surah_number ? "📖" : "📜"}</span>
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
            <div><span className="section-label">تقدم البرنامج</span><h2>{selectedPlan.title}</h2><p>{selectedPlan.duration_days || "—"} يومًا · بمعدل {selectedPlan.daily_target || "—"} وحدة يوميًا</p></div>
            <div className="parent-progress-number"><strong>{progress}%</strong><small>نسبة الإتقان</small></div>
            <div className="parent-progress-track"><span style={{ width: `${progress}%` }} /></div>
          </section>

          <section className="quran-plans-card quran-full-card organized-segments-card">
            <div className="quran-card-head">
              <div><span className="section-label">متابعة مرتبة</span><h2>المقاطع ونتائج المعلم</h2><p>اختر التصنيف المناسب، والمقاطع المستقبلية مطوية تلقائيًا.</p></div>
              <span>{segments.length}</span>
            </div>

            <div className="segment-filter-bar" role="tablist" aria-label="فرز مقاطع الحفظ">
              <button className={segmentFilter === "current" ? "active" : ""} type="button" onClick={() => setSegmentFilter("current")}><span>الآن</span><b>{currentSegments.length}</b></button>
              <button className={segmentFilter === "revision" ? "active" : ""} type="button" onClick={() => setSegmentFilter("revision")}><span>للتصحيح</span><b>{revisionSegments.length}</b></button>
              <button className={segmentFilter === "mastered" ? "active" : ""} type="button" onClick={() => setSegmentFilter("mastered")}><span>المتقنة</span><b>{completedSegments.length}</b></button>
              <button className={segmentFilter === "all" ? "active" : ""} type="button" onClick={() => setSegmentFilter("all")}><span>السجل</span><b>{currentSegments.length + revisionSegments.length + completedSegments.length}</b></button>
            </div>

            {visibleSegments.length === 0 ? (
              <div className="quran-empty-state compact"><span>✨</span><h3>لا توجد مقاطع في هذا التصنيف</h3><p>اختر تصنيفًا آخر أو افتح المقاطع القادمة.</p></div>
            ) : (
              <div className="organized-segment-list">{visibleSegments.map(renderSegment)}</div>
            )}

            <details className="future-segments-fold">
              <summary>
                <div><span>🗓️</span><div><strong>المقاطع القادمة</strong><small>لم يحن موعدها بعد، لذلك بقيت مطوية لتقليل التكدس.</small></div></div>
                <b>{upcomingSegments.length}</b>
              </summary>
              {upcomingSegments.length === 0 ? (
                <div className="future-empty">لا توجد مقاطع مستقبلية في هذه الخطة.</div>
              ) : (
                <div className="future-segment-list">
                  {upcomingSegments.map((segment) => (
                    <article key={segment.id}>
                      <span className="segment-day-badge">{segment.day_number ? `اليوم ${segment.day_number}` : "مقطع"}</span>
                      <div><strong>{segment.portion_label}</strong><small>{formatDate(segment.scheduled_date)}</small></div>
                      <span className="future-lock">مجدول</span>
                    </article>
                  ))}
                </div>
              )}
            </details>
          </section>
        </>
      )}

      <section className="future-parent-rewards-card">
        <span>🎁</span>
        <div><strong>المكافآت والهدايا وسجل الإنجازات</strong><p>تُحتسب نقاط المقاطع ضمن هدف البرنامج، ويمكن مكافأة الطفل عند إتمامه.</p></div>
        <small>مرتبط بالأهداف</small>
      </section>
    </main>
  );
}
