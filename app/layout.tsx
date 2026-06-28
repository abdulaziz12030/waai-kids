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

const waaiBrandRuntime = `
(() => {
  const replacements = [['نماء', 'واعي'], ['NAMAA', 'WAAI'], ['Namaa', 'Waai']];
  const skipped = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);
  const replaceValue = (value) => replacements.reduce((result, pair) => result.split(pair[0]).join(pair[1]), value);

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
  title: 'واعي | WAAI',
  description: BRAND.description
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <HomeStatsAnimator />
        <Script id="waai-brand-runtime" strategy="afterInteractive">{waaiBrandRuntime}</Script>
      </body>
    </html>
  );
}
