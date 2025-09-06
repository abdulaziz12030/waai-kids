import Link from "next/link";

export default function Toys() {
  return (
    <main style={{ direction: "rtl", padding: 40 }}>
      <h2>الألعاب التعليمية للأطفال</h2>
      <ul>
        <li>لعبة تركيب الحروف</li>
        <li>مكعبات الأرقام والألوان</li>
        <li>أجهزة تعليم الحروف والأرقام</li>
      </ul>
      <Link href="/">العودة للرئيسية</Link>
    </main>
  );
}

