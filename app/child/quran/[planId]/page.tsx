"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import MemorizationProgramCard from "../MemorizationProgramCard";
import {
  localToday,
  MatnViewMode,
  pickCurrentSegment,
  PlanGroup,
  QuranData,
  QuranSegment,
  ReligiousContent,
  segmentSortValue,
} from "../matn-types";

type SegmentContent = {
  uthmani_text: string | null;
  readable_text: string | null;
};

export default function ChildMemorizationProgramPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const focusRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<QuranData>({
    plans: [],
    segments: [],
    religious_content: [],
  });
  const [segmentContent, setSegmentContent] = useState<Record<string, SegmentContent>>({});
  const [loadingSegmentId, setLoadingSegmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [recordingSegmentId, setRecordingSegmentId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [matnMode, setMatnMode] = useState<MatnViewMode>("current");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const today = localToday();

  async function loadData() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) {
      router.replace("/child/login");
      return;
    }

    const result = await client.rpc("get_child_quran_program", {
      p_session_token: token,
      p_plan_id: params.planId,
    });
    if (result.error || !result.data) {
      setLoading(false);
      setError("تعذر فتح البرنامج الآن. حاول العودة إلى قائمة البرامج ثم فتحه مجددًا.");
      return;
    }

    const next = result.data as QuranData;
    setData({ ...next, religious_content: next.religious_content || [] });
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [params.planId]);

  const group = useMemo<PlanGroup | null>(() => {
    const plan = data.plans.find((item) => item.id === params.planId);
    if (!plan) return null;
    const segments = data.segments
      .filter((segment) => segment.plan_id === plan.id)
      .sort((a, b) => segmentSortValue(a) - segmentSortValue(b));
    const masteredCount = segments.filter(
      (segment) => segment.status === "mastered",
    ).length;
    const assignedCount = segments.filter((segment) =>
      ["assigned", "needs_revision"].includes(segment.status),
    ).length;
    const waitingCount = segments.filter((segment) =>
      ["memorized", "recited"].includes(segment.status),
    ).length;
    return {
      plan,
      segments,
      current: pickCurrentSegment(segments, today),
      assignedCount,
      waitingCount,
      masteredCount,
      progress: segments.length
        ? Math.round((masteredCount / segments.length) * 100)
        : 0,
    };
  }, [data.plans, data.segments, params.planId, today]);

  function getContent(catalogId: string | null): ReligiousContent | null {
    return (
      data.religious_content.find((item) => item.catalog_id === catalogId) ||
      null
    );
  }

  const content = group ? getContent(group.plan.catalog_item_id) : null;
  const activeSegmentBase: QuranSegment | null = group
    ? group.segments.find((segment) => segment.id === selectedSegmentId) ||
      group.current
    : null;
  const activeSegment: QuranSegment | null = activeSegmentBase
    ? { ...activeSegmentBase, ...(segmentContent[activeSegmentBase.id] || {}) }
    : null;

  useEffect(() => {
    if (!group) return;
    if (!selectedSegmentId)
      setSelectedSegmentId(group.current?.id || group.segments[0]?.id || "");
    if (!selectedChapterId && content?.chapters[0])
      setSelectedChapterId(content.chapters[0].id);
  }, [content, group, selectedChapterId, selectedSegmentId]);

  useEffect(() => {
    const segmentId = activeSegmentBase?.id;
    if (!segmentId || group?.plan.content_kind === "matn" || segmentContent[segmentId]) return;

    let cancelled = false;
    async function loadSegmentContent() {
      const client = supabase;
      const token = localStorage.getItem("namaa_child_token");
      if (!client || !token) return;

      setLoadingSegmentId(segmentId);
      const result = await client.rpc("get_child_quran_segment_content", {
        p_session_token: token,
        p_segment_id: segmentId,
      });
      if (cancelled) return;
      setLoadingSegmentId("");

      if (result.error || !result.data) {
        setError("تعذر تحميل نص المقطع. حاول فتحه مرة أخرى.");
        return;
      }

      const payload = result.data as { id: string } & SegmentContent;
      setSegmentContent((current) => ({
        ...current,
        [payload.id]: {
          uthmani_text: payload.uthmani_text,
          readable_text: payload.readable_text,
        },
      }));
    }

    void loadSegmentContent();
    return () => {
      cancelled = true;
    };
  }, [activeSegmentBase?.id, group?.plan.content_kind, segmentContent]);

  async function markMemorized(segmentId: string) {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) return;
    setBusyId(segmentId);
    setError("");
    setSuccess("");
    const result = await client.rpc("child_mark_quran_memorized", {
      p_session_token: token,
      p_segment_id: segmentId,
    });
    setBusyId("");
    if (result.error) {
      setError("تعذر إرسال المقطع للتسميع.");
      return;
    }
    setSuccess("أحسنت! تم إرسال المقطع للتسميع.");
    await loadData();
  }

  function selectSegment(segmentId: string) {
    if (recordingSegmentId) return;
    setSelectedSegmentId(segmentId);
    setMatnMode("current");
    window.requestAnimationFrame(() =>
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  if (loading)
    return <main className="dashboard-loading">جارٍ فتح البرنامج...</main>;

  if (!group) {
    return (
      <main className="child-quran-page child-program-detail-page">
        <section className="child-friendly-empty child-quran-empty">
          <span>📘</span>
          <strong>لم يتم العثور على البرنامج</strong>
          <p>{error || "قد يكون البرنامج قد أوقف أو حُذف."}</p>
          <Link className="soft-action-button" href="/child/quran">
            العودة إلى برامجي
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="child-quran-page child-quran-focus-page child-program-detail-page">
      <header className="child-app-header child-quran-page-header child-program-detail-header">
        <div>
          <span className="section-label">
            {group.plan.content_kind === "matn"
              ? "📜 برنامج علمي"
              : "📖 برنامج حفظ"}
          </span>
          <h1>{group.plan.title}</h1>
          <p>هذا البرنامج فقط ظاهر أمامك حتى تركز دون تداخل.</p>
        </div>
        <Link className="quiet-button" href="/child/quran">
          كل البرامج
        </Link>
      </header>

      {error && (
        <p className="form-message error-message floating-message">{error}</p>
      )}
      {success && (
        <p className="form-message success-message floating-message">
          {success}
        </p>
      )}

      <MemorizationProgramCard
        group={group}
        index={0}
        isOpen
        standalone
        activeSegment={activeSegment}
        segmentTextLoading={Boolean(activeSegmentBase && loadingSegmentId === activeSegmentBase.id)}
        content={content}
        matnMode={matnMode}
        selectedChapterId={selectedChapterId || content?.chapters[0]?.id || ""}
        recordingSegmentId={recordingSegmentId}
        busyId={busyId}
        today={today}
        focusRef={focusRef}
        onToggle={() => undefined}
        onSelectSegment={selectSegment}
        onMatnModeChange={setMatnMode}
        onChapterChange={setSelectedChapterId}
        onRecordingChange={(segmentId, isRecording) =>
          setRecordingSegmentId(isRecording ? segmentId : "")
        }
        onUploaded={loadData}
        onMarkMemorized={markMemorized}
      />
    </main>
  );
}
