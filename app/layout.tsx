import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نماء",
  description: "منصة تربوية تعليمية للأطفال والطلاب"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
