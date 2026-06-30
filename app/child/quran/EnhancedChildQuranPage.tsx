"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import MemorizationProgramCard from "./MemorizationProgramCard";
import {
  localToday,
  MatnViewMode,
  pickCurrentSegment,
  PlanGroup,
  QuranData,
  QuranSegment,
  ReligiousContent,
  segmentSortValue
} from "./matn-types";

export default function EnhancedChildQuranPage() {
  const router = useRouter();
  const focusRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [data, setData] = useState<QuranData>({ plans: [], segments: [], religious_content: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [recordingSegmentId, setRecordingSegmentId] = useState("");
  const [openPlanId, setOpenPlanId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [matnModes, setMatnModes] = useState<Record<string, MatnViewMode>>({});
  const [selectedChapters, setSelectedChapters] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) {
      router.replace("/child/login");
      return;
    }

    const result = await client.rpc("get_child_quran_dashboard", { p_session_token: token });
    if (result.error || !result.data) {
      localStorage.removeItem("namaa_child_token");
      router.replace("/child/login");
      return;
    }

    const next = result.data as QuranData;
    setData({ ...next, religious_content: next.religious_content || [] });
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);
  const today = localToday();

  const planGroups = useMemo<PlanGroup[]>(() => data.plans.map((plan) => {
    const segments = data.segments
      .filter((segment) => segment.plan_id === plan.id)
      .sort((a, b) => segmentSortValue(a) - segmentSortValue(b));
    const masteredCount = segments.filter((segment) => segment.status === "mastered").length;
    const assignedCount = segments.filter((segment) => ["assigned", "needs_revision"].includes(segment.status)).length;
    const waitingCount = segments.filter((segment) => ["memorized", "recited"].includes(segment.status)).length;
    return {
      plan,
      segments,
      current: pickCurrentSegment(segments, today),
      assignedCount,
      waitingCount,
      masteredCount,
      progress: segments.length ? Math.round((masteredCount / segments.length) * 100) : 0
    };
  }), [data.plans, data.segments, today]);

  const recommendedGroup = useMemo(() => (
    planGroups.find((group) => group.current?.status === "needs_revision")
    || planGroups.find((group) => group.current?.status === "assigned" && (!group.current.scheduled_date || group.current.scheduled_date <= today))
    || planGroups.find((group) => group.current)
    || planGroups[0]
    || null
  ), [planGroups, today]);

  useEffect(() => {
    if (!initializedRef.current && recommendedGroup) {
      initializedRef.current = true;
      setOpenPlanId(recommendedGroup.plan.id);
      setSelectedSegmentId(recommendedGroup.current?.id || recommendedGroup.segments[0]?.id || "");
      const content = getContent(recommendedGroup.plan.catalog_item_id);
      if (content?.chapters[0]) {
        setSelectedChapters({ [recommendedGroup.plan.id]: content.chapters[0].id });
      }
      return;
    }
    if (openPlanId && !planGroups.some((group) => group.plan.id === openPlanId)) {
      setOpenPlanId("");
      setSelectedSegmentId("");
    }
  }, [openPlanId, planGroups, recommendedGroup]);

  function getContent(catalogId: string | null): ReligiousContent | null {
    return data.religious_content.find((item) => item.catalog_id === catalogId) || null;
  }

  const activeGroup = planGroups.find((group) => group.plan.id === openPlanId) || null;
  const activeSegment: QuranSegment | null = activeGroup
    ? activeGroup.segments.find((segment) => segment.id === selectedSegmentId) || activeGroup.current
    : null;

  const totalMastered = data.segments.filter((segment) => segment.status === "mastered").length;
  const totalPending = data.segments.filter((segment) => ["assigned", "needs_revision"].includes(segment.status)).length;

  async function markMemorized(segmentId: string) {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) return;
    setBusyId(segmentId);
    setError("");
    setSuccess("");
    const result = await client.rpc("child_mark_quran_memorized", {
      p_session_token: token,
      p_segment_id: segmentId
    });
    setBusyId("");
    if (result.error) {
      setError("تعذر إرسال المقطع للتسميع.");
      return;
    }
    setSuccess("أحسنت! تم إرسال المقطع للتسميع بدون تسجيل صوتي.");
    await loadData();
  }

  function togglePlan(group: PlanGroup) {
    if (recordingSegmentId) return;
    if (openPlanId === group.plan.id) {
      setOpenPlanId("");
      return;
    }
    setOpenPlanId(group.plan.id);
    if (!group.segments.some((segment) => segment.id === selectedSegmentId)) {
      setSelectedSegmentId(group.current?.id || group.segments[0]?.id || "");
    }
    const content = getContent(group.plan.catalog_item_id);
    if (content?.chapters[0]) {
      setSelectedChapters((current) => ({
        ...current,
        [group.plan.id]: current[group.plan.id] || content.chapters[0].id
      }));
    }
  }

  function selectSegment(group: PlanGroup, segmentId: string) {
    if (recordingSegmentId) return;
    setOpenPlanId(group.plan.id);
    setSelectedSegmentId(segmentId);
    setMatnModes((current) => ({ ...current, [group.plan.id]: "current" }));
    window.requestAnimationFrame(() => focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (loading) return <main className="dashboard-loading">جارٍ تجهيز برنامج الحفظ...</main>;

  return (
    <main className="child-quran-page child-quran-focus-page">
      <header className="child-app-header child-quran-page-header">
        <div>
          <span className="section-label">📖 برامجي</span>
          <h1>الحفظ والتسميع</h1>
          <p>اختر برنامج الحفظ، ثم اعرض المقطع الحالي أو قسمًا من المتن أو القصيدة كاملة.</p>
        </div>
      </header>

      {error && <p className="form-message error-message floating-message">{error}</p>}
      {success && <p className="form-message success-message floating-message">{success}</p>}

      <section className="child-quran-hero child-quran-hero-focused">
        <div className="child-quran-hero-message">
          <span>🌙</span>
          <div><h2>{data.plans.length > 1 ? "برامجك مرتبة في مكان واحد" : "برنامجك جاهز"}</h2><p>افتح البرنامج، ثم اختر طريقة العرض المناسبة.</p></div>
        </div>
        <div className="child-quran-stats">
          <article><strong>{data.plans.length}</strong><small>برامج الحفظ</small></article>
          <article><strong>{totalPending}</strong><small>مقاطع حالية وقادمة</small></article>
          <article><strong>{totalMastered}</strong><small>مقاطع متقنة</small></article>
        </div>
      </section>

      {data.plans.length === 0 ? (
        <section className="child-friendly-empty child-quran-empty">
          <span>📘</span><strong>لا توجد خطة حفظ بعد</strong><p>سيضيف ولي الأمر أو المعلم خطة الحفظ المناسبة لك.</p>
        </section>
      ) : (
        <section className="child-quran-programs" aria-label="برامج الحفظ">
          <div className="child-programs-heading">
            <div><span className="section-label">التصفية حسب البرنامج</span><h2>اختر برنامج الحفظ</h2></div>
            <small>يفتح برنامج واحد فقط في كل مرة.</small>
          </div>

          {planGroups.map((group, index) => {
            const content = getContent(group.plan.catalog_item_id);
            return (
              <MemorizationProgramCard
                key={group.plan.id}
                group={group}
                index={index}
                isOpen={openPlanId === group.plan.id}
                activeSegment={activeSegment}
                content={content}
                matnMode={matnModes[group.plan.id] || "current"}
                selectedChapterId={selectedChapters[group.plan.id] || content?.chapters[0]?.id || ""}
                recordingSegmentId={recordingSegmentId}
                busyId={busyId}
                today={today}
                focusRef={focusRef}
                onToggle={() => togglePlan(group)}
                onSelectSegment={(segmentId) => selectSegment(group, segmentId)}
                onMatnModeChange={(mode) => setMatnModes((current) => ({ ...current, [group.plan.id]: mode }))}
                onChapterChange={(chapterId) => setSelectedChapters((current) => ({ ...current, [group.plan.id]: chapterId }))}
                onRecordingChange={(segmentId, isRecording) => setRecordingSegmentId(isRecording ? segmentId : "")}
                onUploaded={loadData}
                onMarkMemorized={markMemorized}
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
