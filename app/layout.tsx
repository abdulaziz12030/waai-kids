import type { Metadata } from 'next';
import HomeStatsAnimator from './components/HomeStatsAnimator';
import './globals.css';
import './phase3.css';
import './children.css';
import './mobile.css';
import './avatar-controls.css';
import './dashboard-v2.css';
import './motion.css';
import './goals.css';
import './goal-planner.css';
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

export const metadata: Metadata = {
  title: 'نماء',
  description: 'منصة تربوية تعليمية للأطفال والطلاب'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <HomeStatsAnimator />
      </body>
    </html>
  );
}
