import Link from "next/link";

export default function Schoolbag() {
  return (
    <main style={{ direction: "rtl", padding: 40 }}>
      <h2>الحقيبة المدرسية</h2>
      <ul>
        <li>حقائب مدرسية بجودة عالية</li>
        <li>أقلام وأدوات مدرسية</li>
        <li>دفاتر ملونة وكراسات مميزة</li>
      </ul>
      <Link href="/">العودة للرئيسية</Link>
    </main>
  );
}

