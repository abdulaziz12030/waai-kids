import type { Metadata } from 'next';
import Script from 'next/script';
import HomeStatsAnimator from './components/HomeStatsAnimator';
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

const waaiKidsBrandRuntime = `
(() => {
  const skipped = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);
  const replaceValue = (value) => value
    .replace(/نماء/g, 'واعي كيدز')
    .replace(/واعي(?! كيدز)/g, 'واعي كيدز')
    .replace(/NAMAA/g, 'WAAI KIDS')
    .replace(/WAAI(?! KIDS)/g, 'WAAI KIDS')
    .replace(/Namaa/g, 'Waai Kids')
    .replace(/Waai(?! Kids)/g, 'Waai Kids')
    .replace(/https:\/\/kids\.waai\.sa/g, 'https://waai-kids.com')
    .replace(/kids\.waai\.sa/g, 'waai-kids.com');

  const updateBrand = () => {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !skipped.has(parent.tagName) && node.nodeValue) {
        const nextValue = replaceValue(node.nodeValue);
        if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
      }
      node = walker.nextNode();
    }

    document.querySelectorAll('[aria-label], [title], [alt], [placeholder]').forEach((element) => {
      ['aria-label', 'title', 'alt', 'placeholder'].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value) return;
        const nextValue = replaceValue(value);
        if (nextValue !== value) element.setAttribute(attribute, nextValue);
      });
    });

    document.querySelectorAll('.brand-mark, .namaa-logo-mark').forEach((mark) => {
      if (mark.textContent && mark.textContent.trim() === 'ن') mark.textContent = 'و';
    });
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateBrand();
    });
  };

  updateBrand();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.arabicName} | ${BRAND.englishName}`,
    template: `%s | ${BRAND.arabicName}`
  },
  description: BRAND.description,
  applicationName: BRAND.arabicName,
  keywords: ['واعي كيدز', 'WAAI KIDS', 'تنمية الطفل', 'تربية الأطفال', 'أهداف الأطفال', 'مهام الأطفال', 'تحفيز الأطفال', 'حفظ القرآن للأطفال'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: BRAND.url,
    siteName: `${BRAND.arabicName} | ${BRAND.englishName}`,
    title: `${BRAND.arabicName} — ${BRAND.tagline}`,
    description: BRAND.description
  },
  twitter: {
    card: 'summary',
    title: `${BRAND.arabicName} — ${BRAND.tagline}`,
    description: BRAND.description
  },
  icons: { icon: '/icon.svg' },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <HomeStatsAnimator />
        <Script id="waai-kids-brand-runtime" strategy="afterInteractive">{waaiKidsBrandRuntime}</Script>
      </body>
    </html>
  );
}
