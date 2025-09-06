import Link from "next/link";

export default function Home() {
  return (
    <main style={{ direction: "rtl", padding: 40 }}>
      <h1>واعي كيدز - Waai Kids</h1>
      <nav>
        <ul style={{ listStyle: "none", padding: 0, fontSize: 20 }}>
          <li><Link href="/gifts">🎁 هدايا المواليد</Link></li>
          <li><Link href="/toys">🧸 الألعاب التعليمية</Link></li>
          <li><Link href="/services">🔬 خدمات علمية للأطفال</Link></li>
          <li><Link href="/schoolbag">🎒 الحقيبة المدرسية</Link></li>
        </ul>
      </nav>
    </main>
  );
}

