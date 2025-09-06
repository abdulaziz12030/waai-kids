
import Link from "next/link";

export default function Services() {
  return (
    <main style={{ direction: "rtl", padding: 40 }}>
      <h2>خدمات علمية للأطفال</h2>
      <ul>
        <li>ورش عمل قصيرة حول العلوم</li>
        <li>دورات أونلاين لتعلم البرمجة للأطفال</li>
        <li>كتب تفاعلية وفيديوهات تعليمية</li>
      </ul>
      <Link href="/">العودة للرئيسية</Link>
    </main>
  );
}
