"use client";

export type MatnVerse = {
  unit_number: number;
  first_part: string | null;
  second_part: string | null;
  full_text?: string | null;
};

type Props = {
  verses: MatnVerse[];
  compact?: boolean;
  title?: string;
  showNumbers?: boolean;
};

export default function MatnTextDisplay({ verses, compact = false, title, showNumbers = true }: Props) {
  if (!verses.length) return <p className="quran-text-pending">تعذر تحميل أبيات هذا القسم.</p>;

  return (
    <section className={`matn-text-display ${compact ? "compact" : ""}`} lang="ar" dir="rtl">
      <div className="matn-text-heading">
        <div>
          <span>✦ نصٌّ مضبوط بالحركات</span>
          {title && <strong>{title}</strong>}
        </div>
        <small>{verses.length} {verses.length === 1 ? "بيت" : "أبيات"}</small>
      </div>

      <div className="matn-verses-list">
        {verses.map((verse) => (
          <article className="matn-verse-row" key={verse.unit_number}>
            {showNumbers && <b className="matn-verse-number">{verse.unit_number}</b>}
            <div className="matn-hemistichs">
              <p>{verse.first_part || verse.full_text?.split("\n")[0] || ""}</p>
              <span aria-hidden="true">✦</span>
              <p>{verse.second_part || verse.full_text?.split("\n")[1] || ""}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
