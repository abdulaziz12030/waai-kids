import type { Metadata } from 'next';
import HomeStatsAnimator from './components/HomeStatsAnimator';
import BrandIdentity from './components/BrandIdentity';
import { BRAND } from './brand';
import './globals.css';
import './phase3.css';
import './children.css';
import './mobile.css';
import './avatar-controls.css';
import './dashboard-v2.css';
import './motion.css';
import './goals.css';
import './goal-planner.css';
import './goal-part-descriptions.css';
import './child-app.css';
import './home-child-entry.css';
import './tasks.css';
import './task-requirements.css';
import './ui-refresh.css';
import './security-controls.css';
import './points-v2.css';
import './landing-v2.css';
import './landing-teacher-entry.css';
import './animated-stats.css';
import './family-quran.css';
import './child-quran.css';
import './quran-readable.css';
import './quran-display.css';
import './teacher-quran.css';
import './quran-plan-controls.css';
import './quran-audio.css';
import './parent-review-pipeline.css';
import './quran-role-separation.css';
import './login-roles.css';
import './teacher-workspace.css';
import './teacher-review-polish.css';
import './teacher-recovery.css';
import './waai-brand.css';

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.arabicName} | ${BRAND.englishName}`,
    template: `%s | ${BRAND.arabicName}`
  },
  description: BRAND.description,
  applicationName: BRAND.arabicName,
  keywords: ['واعي', 'WAAI', 'منصة أطفال', 'تربية الأطفال', 'الأهداف والمهام', 'حفظ القرآن', 'تحفيز الأطفال'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: BRAND.url,
    siteName: `${BRAND.arabicName} | ${BRAND.englishName}`,
    title: `${BRAND.arabicName} — ${BRAND.tagline}`,
    description: BRAND.description
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <BrandIdentity />
        {children}
        <HomeStatsAnimator />
      </body>
    </html>
  );
}
