"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  localToday,
  pickCurrentSegment,
  PlanGroup,
  QuranData,
  segmentSortValue,
} from "./matn-types";

export default function EnhancedChildQuranPage() {
  const router = useRouter();
  const [data, setData] = useState<QuranData>({
    plans: [],
    segments: [],
    religious_content: [],
  });
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) {
      router.replace("/child/login");
      return;
    }

    const result = await client.rpc("get_child_quran_dashboard", {
      p_session_token: token,
    });
    if (result.error || !result.data) {
      localStorage.removeItem("namaa_child_token");
      router.replace("/child/login");
      return;
    }

    const next = result.data as QuranData;
    setData({ ...next, religious_content: next.religious_content || [] });
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);
  const today = localToday();

  const planGroups = useMemo<PlanGroup[]>(
    () =>
      data.plans.map((plan) => {
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
      }),
    [data.plans, data.segments, today],
  );

  const totalMastered = data.segments.filter(
    (segment) => segment.status === "mastered",
  ).length;
  const totalPending = data.segments.filter((segment) =>
    ["assigned", "needs_revision"].includes(segment.status),
  ).length;

  if (loading)
    return <main className="dashboard-loading">جارٍ تجهيز برامج الحفظ...</main>;

  return (
    <main className="child-quran-page child-quran-focus-page child-quran-library-page">
      <header className="child-app-header child-quran-page-header">
        <div>
          <span className="section-label">📖 الحفظ والبرامج</span>
          <h1>برامجي</h1>
          <p>
            كل برنامج في بطاقة مستقلة. افتح البرنامج الذي تريد العمل عليه فقط.
          </p>
        </div>
        <Link className="quiet-button" href="/child">
          العودة
        </Link>
      </header>

      <section className="child-quran-hero child-quran-hero-focused child-program-library-hero">
        <div className="child-quran-hero-message">
          <span>🌙</span>
          <div>
            <h2>ركز على برنامج واحد</h2>
            <p>لن تظهر تفاصيل البرامج الأخرى داخل صفحة البرنامج المفتوح.</p>
          </div>
        </div>
        <div className="child-quran-stats">
          <article>
            <strong>{data.plans.length}</strong>
            <small>برامج</small>
          </article>
          <article>
            <strong>{totalPending}</strong>
            <small>مقاطع حالية</small>
          </article>
          <article>
            <strong>{totalMastered}</strong>
            <small>مقاطع متقنة</small>
          </article>
        </div>
      </section>

      {data.plans.length === 0 ? (
        <section className="child-friendly-empty child-quran-empty">
          <span>📘</span>
          <strong>لا توجد خطة حفظ بعد</strong>
          <p>سيضيف ولي الأمر أو المعلم خطة الحفظ المناسبة لك.</p>
        </section>
      ) : (
        <section className="child-program-library" aria-label="برامج الحفظ">
          <div className="child-programs-heading">
            <div>
              <span className="section-label">اختر برنامجًا</span>
              <h2>برامج الحفظ والتعلم</h2>
            </div>
            <small>اضغط على البطاقة لفتح صفحة البرنامج.</small>
          </div>

          <div className="child-program-library-grid">
            {planGroups.map((group, index) => {
              const isMatn = group.plan.content_kind === "matn";
              const currentLabel =
                group.current?.portion_label ||
                (group.segments.length
                  ? "متابعة البرنامج"
                  : "لم تبدأ المقاطع بعد");
              return (
                <Link
                  className="child-program-link-card"
                  href={`/child/quran/${group.plan.id}`}
                  key={group.plan.id}
                >
                  <span className="program-number">{index + 1}</span>
                  <span className="program-library-icon">
                    {isMatn ? "📜" : "📖"}
                  </span>
                  <span className="program-library-copy">
                    <small>
                      {isMatn
                        ? group.plan.subject_category || "برنامج علمي"
                        : "حفظ القرآن"}
                    </small>
                    <strong>{group.plan.title}</strong>
                    <p>{currentLabel}</p>
                  </span>
                  <span className="program-library-progress">
                    <b>{group.progress}%</b>
                    <i>
                      <em style={{ width: `${group.progress}%` }} />
                    </i>
                    <small>
                      {group.masteredCount} من {group.segments.length} متقن
                    </small>
                  </span>
                  <span className="program-library-arrow">←</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
