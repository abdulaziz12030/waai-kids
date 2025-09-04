import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "واعي كيدز | Waai Kids",
  description: "متجر للهدايا التعليمية وخدمات الطالب في المرحلة الابتدائية"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="border-b bg-white/80">
          <div className="container py-4 flex items-center justify-between">
            <strong>واعي كيدز · Waai Kids</strong>
            <nav className="flex gap-3 text-sm">
              <a href="/">الرئيسية</a>
              <a href="/gifts">هدايا المواليد</a>
              <a href="/toys">ألعاب تعليمية</a>
              <a href="/services">خدمات الطالب</a>
              <a href="/cart">السلة</a>
            </nav>
          </div>
        </header>
        <main className="container py-8">{children}</main>
        <footer className="border-t">
          <div className="container py-6 text-sm flex items-center justify-between">
            <div>© {new Date().getFullYear()} واعي كيدز</div>
            <nav className="flex gap-4">
              <a href="/privacy">الخصوصية</a>
              <a href="/refund">الاسترجاع</a>
              <a href="/terms">الشروط</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
import "./globals.css";
import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400","600","700"] });

export const metadata: Metadata = {
  title: "واعي كيدز | Waai Kids",
  description: "متجر للهدايا التعليمية وخدمات الطالب في المرحلة الابتدائية",
  icons: [{ rel: "icon", url: "/favicon.ico" }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <Header />
        <main className="container py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
