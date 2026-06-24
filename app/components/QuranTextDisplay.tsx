"use client";

import { useMemo, useState } from "react";

type Props = {
  uthmaniText?: string | null;
  readableText?: string | null;
  compact?: boolean;
  initialMode?: "mushaf" | "learning";
};

function splitVerses(text: string) {
  const parts = text.match(/.*?﴿[٠-٩]+﴾/g);
  if (parts?.length) return parts.map((part) => part.trim()).filter(Boolean);
  return [text.trim()].filter(Boolean);
}

export default function QuranTextDisplay({ uthmaniText, readableText, compact = false, initialMode = "mushaf" }: Props) {
  const [mode, setMode] = useState<"mushaf" | "learning">(initialMode);
  const verses = useMemo(() => splitVerses(readableText || ""), [readableText]);

  if (!uthmaniText && !readableText) {
    return <p className="quran-text-pending">تعذر تحميل نص المقطع.</p>;
  }

  return (
    <section className={compact ? "quran-display compact" : "quran-display"}>
      <div className="quran-mode-switch" role="group" aria-label="طريقة عرض القرآن">
        <button type="button" className={mode === "mushaf" ? "active" : ""} onClick={() => setMode("mushaf")}>مصحف</button>
        <button type="button" className={mode === "learning" ? "active" : ""} onClick={() => setMode("learning")}>تعلم</button>
      </div>

      {mode === "mushaf" && uthmaniText ? (
        <p className="quran-mushaf-text">{uthmaniText}</p>
      ) : (
        <div className="quran-learning-text">
          {verses.map((verse, index) => <span className="quran-learning-verse" key={`${index}-${verse.slice(-5)}`}>{verse}</span>)}
        </div>
      )}

      {mode === "learning" && <p className="quran-learning-note">الألوان تفصل بين الآيات لتسهيل المراجعة، وليست ترميزًا لأحكام التجويد.</p>}
    </section>
  );
}
