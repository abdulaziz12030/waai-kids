import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>واعي كيدز – متعة التعلم وبهجة الهدايا</h1>
        <p>هدايا مواليد راقية، ألعاب تعليمية متخصصة، وخدمات الطالب (مطويات، أنشطة، ملخصات).</p>
        <div style={{display:"flex",gap:12,marginTop:12}}>
          <Link className="btn" href="/gifts">هدايا المواليد</Link>
          <Link className="btn" href="/toys">ألعاب تعليمية</Link>
          <Link className="btn" href="/services">خدمات الطالب</Link>
        </div>
      </section>

      <section style={{marginTop:24}} className="grid grid-3">
        <Link className="card" href="/gifts"><strong>🎁 هدايا المواليد</strong><p>صناديق شخصية، بطانيات، إطارات بصمة.</p></Link>
        <Link className="card" href="/toys"><strong>🧩 ألعاب تعليمية</strong><p>STEM، بازل، مكعبات حسية وإبداع.</p></Link>
        <Link className="card" href="/services"><strong>📘 خدمات الطالب</strong><p>مطويات، أوراق عمل، ملخصات للابتدائي.</p></Link>
      </section>

      <section style={{marginTop:24}} className="badges">
        <div>🚚 شحن محلي سريع</div>
        <div>🔒 دفع آمن</div>
        <div>↩️ استرجاع سهل</div>
      </section>
    </>
  );
}
