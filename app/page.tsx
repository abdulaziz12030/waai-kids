import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="card bg-gradient-to-l from-brand-yellow/40 to-brand-blue/20">
        <div className="flex flex-col gap-4 items-start">
          <h1 className="text-3xl font-bold">واعي كيدز – متعة التعلم وبهجة الهدايا</h1>
          <p>هدايا المواليد، ألعاب تعليمية متخصصة، وخدمات الطالب (مطويات، أنشطة، ملخصات).</p>
          <div className="flex gap-3">
            <Link className="btn btn-primary" href="/gifts">هدايا المواليد</Link>
            <Link className="btn border" href="/toys">ألعاب تعليمية</Link>
            <Link className="btn border" href="/services">خدمات الطالب</Link>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        {[
          { href: "/gifts", title: "هدايا المواليد", desc: "صناديق هدايا وشخصنة بالاسم" },
          { href: "/toys", title: "ألعاب تعليمية", desc: "STEM، بازل، مكعبات حسية" },
          { href: "/services", title: "خدمات الطالب", desc: "مطويات، أوراق عمل، ملخصات" }
        ].map((c) => (
          <Link key={c.href} href={c.href} className="card hover:shadow-md transition">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-gray-600">{c.desc}</p>
          </Link>
        ))}
      </section>

      <section className="card">
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl">🚚</div><div>شحن محلي سريع</div></div>
          <div><div className="text-2xl">🔒</div><div>دفع آمن</div></div>
          <div><div className="text-2xl">↩️</div><div>استرجاع سهل</div></div>
        </div>
      </section>
    </div>
  );
}
