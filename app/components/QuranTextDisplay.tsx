"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  uthmaniText?: string | null;
  readableText?: string | null;
  compact?: boolean;
  initialMode?: "mushaf" | "learning";
  loading?: boolean;
};

const PAGE_SIZE = 15;
const LONG_PASSAGE_THRESHOLD = 30;

function splitVerses(text: string) {
  const parts = text.match(/.*?﴿[٠-٩]+﴾/g);
  if (parts?.length) return parts.map((part) => part.trim()).filter(Boolean);
  return [text.trim()].filter(Boolean);
}

export default function QuranTextDisplay({
  uthmaniText,
  readableText,
  compact = false,
  initialMode = "mushaf",
  loading = false,
}: Props) {
  const verses = useMemo(() => splitVerses(readableText || ""), [readableText]);
  const longPassage = verses.length > LONG_PASSAGE_THRESHOLD;
  const [mode, setMode] = useState<"mushaf" | "learning">(() =>
    initialMode === "mushaf" && splitVerses(readableText || "").length > LONG_PASSAGE_THRESHOLD
      ? "learning"
      : initialMode,
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(verses.length / PAGE_SIZE));
  const visibleVerses = useMemo(
    () => verses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [page, verses],
  );

  useEffect(() => {
    setPage(0);
    if (initialMode === "mushaf" && verses.length > LONG_PASSAGE_THRESHOLD) {
      setMode("learning");
    }
  }, [initialMode, readableText, verses.length]);

  if (loading) {
    return (
      <div className="quran-text-loader" role="status" aria-live="polite">
        <span />
        <strong>جارٍ تحميل آيات المقطع...</strong>
        <small>سيظهر النص فقط، دون إعادة تحميل بقية البرنامج.</small>
      </div>
    );
  }

  if (!uthmaniText && !readableText) {
    return <p className="quran-text-pending">تعذر تحميل نص المقطع.</p>;
  }

  return (
    <section className={compact ? "quran-display compact" : "quran-display"}>
      <div className="quran-mode-switch" role="group" aria-label="طريقة عرض القرآن">
        <button type="button" className={mode === "mushaf" ? "active" : ""} onClick={() => setMode("mushaf")}>مصحف</button>
        <button type="button" className={mode === "learning" ? "active" : ""} onClick={() => setMode("learning")}>تعلم</button>
      </div>

      {longPassage && mode === "learning" && (
        <p className="quran-long-passage-note">لخفة الصفحة قُسّمت السورة إلى صفحات صغيرة، ويمكن التنقل بينها دون إعادة التحميل.</p>
      )}

      {mode === "mushaf" && uthmaniText ? (
        <p className="quran-mushaf-text">{uthmaniText}</p>
      ) : (
        <>
          <div className="quran-learning-text">
            {visibleVerses.map((verse, index) => (
              <span className="quran-learning-verse" key={`${page}-${index}-${verse.slice(-5)}`}>{verse}</span>
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="quran-page-controls" aria-label="التنقل بين صفحات الآيات">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                الصفحة السابقة
              </button>
              <span>صفحة {page + 1} من {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              >
                الصفحة التالية
              </button>
            </nav>
          )}
        </>
      )}

      {mode === "learning" && <p className="quran-learning-note">الألوان تفصل بين الآيات لتسهيل المراجعة، وليست ترميزًا لأحكام التجويد.</p>}
    </section>
  );
}
