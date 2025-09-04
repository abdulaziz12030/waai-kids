import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import CartProvider from "@/providers/CartProvider";

export const metadata: Metadata = {
  title: "واعي كيدز | Waai Kids",
  description: "متجر هدايا المواليد والألعاب التعليمية وخدمات الطالب الابتدائي"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <CartProvider>
          <header className="header">
            <div className="container" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <strong>واعي كيدز · Waai Kids</strong>
              <nav className="nav" style={{display:"flex",alignItems:"center"}}>
                <Link href="/">الرئيسية</Link>
                <Link href="/gifts">هدايا المواليد</Link>
                <Link href="/toys">ألعاب تعليمية</Link>
                <Link href="/services">خدمات الطالب</Link>
                <Link href="/cart">السلة</Link>
              </nav>
            </div>
          </header>
          <main className="container" style={{padding:"24px 16px"}}>{children}</main>
          <footer className="footer">
            <div className="container" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"16px 0"}}>
              <div>© {new Date().getFullYear()} واعي كيدز</div>
              <nav>
                <Link href="/privacy">الخصوصية</Link>|
                <Link href="/refund">الاسترجاع</Link>|
                <Link href="/terms">الشروط</Link>
              </nav>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
