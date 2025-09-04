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
