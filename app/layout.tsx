import type { Metadata } from 'next';
import './globals.css';
import './phase3.css';
import './children.css';
import './mobile.css';
import './avatar-controls.css';
import './dashboard-v2.css';
import './motion.css';
import './goals.css';

export const metadata: Metadata = {
  title: 'نماء',
  description: 'منصة تربوية تعليمية للأطفال والطلاب'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
