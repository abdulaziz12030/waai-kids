import Link from "next/link";

export default function Gifts() {
  return (
    <main style={{ direction: "rtl", padding: 40 }}>
      <h2>هدايا المواليد</h2>
      <ul>
        <li>علب هدايا أطفال مميزة</li>
        <li>ملابس مواليد فاخرة</li>
        <li>مجسمات تذكار اسم الطفل</li>
      </ul>
      <Link href="/">العودة للرئيسية</Link>
    </main>
  );
}

