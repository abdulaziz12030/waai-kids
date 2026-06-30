import './hero-orbit-overrides.css';
import AboutWaaiMotion from './components/AboutWaaiMotion';
import FeaturesMotion from './components/FeaturesMotion';
import HeroCopyMotion from './components/HeroCopyMotion';
import HowStepsMotion from './components/HowStepsMotion';
import WaaiMark from './components/WaaiMark';

const features = [
  { icon: '🔒', title: 'آمن وموثوق', description: 'خصوصية عالية وصلاحيات مستقلة لكل فرد.' },
  { icon: '👥', title: 'متابعة ذكية', description: 'تقارير توضح تقدم الأبناء والطلاب بسهولة.' },
  { icon: '📋', title: 'مهام يومية', description: 'خطوات بسيطة تبني عادات عظيمة مع الوقت.' },
  { icon: '🎯', title: 'أهداف واضحة', description: 'يختار الطفل هدفه ويعرف طريق الوصول إليه.' },
  { icon: '⭐', title: 'نظام نقاط ذكي', description: 'تحفيز مستمر يربط الإنجاز بالمكافأة.' }
];

const steps = [
  { number: '1', icon: '👨‍👩‍👦', title: 'أنشئ حسابك', description: 'سجّل كولي أمر أو معلم وأضف أبناءك أو طلابك في دقائق.' },
  { number: '2', icon: '🎯', title: 'حدد الأهداف والمهام', description: 'أضف أهدافًا مناسبة وحدد المهام اليومية وخطط الحفظ.' },
  { number: '3', icon: '🎁', title: 'تابع الإنجاز وكافئهم', description: 'راجع التقدم واعتمد الإنجازات وامنح المكافآت التشجيعية.' }
];

const stats = [
  { icon: '👥', value: '+10,000', label: 'أسرة تثق بنا' },
  { icon: '⭐', value: '+200,000', label: 'مهمة مكتملة' },
  { icon: '✅', value: '+1,000,000', label: 'نقطة تم منحها' },
  { icon: '💜', value: '+20,000', label: 'هدف تم تحقيقه' }
];

function ChartIcon() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="7" y="22" width="6" height="11" rx="2" fill="currentColor"/><rect x="17" y="15" width="6" height="18" rx="2" fill="currentColor"/><rect x="27" y="8" width="6" height="25" rx="2" fill="currentColor"/></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 20.5l7.2 7.2L31.5 12" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function TargetIcon() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="19" cy="21" r="12" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="19" cy="21" r="6" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="19" cy="21" r="2.5" fill="currentColor"/><path d="M23 17L34 6M29 6h5v5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function UserIcon() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="14" r="7" fill="currentColor"/><path d="M8 33c1.2-7 5.4-10.5 12-10.5S30.8 26 32 33" fill="currentColor"/></svg>;
}

function MedalIcon() {
  return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M13 5l7 11L27 5h-5l-2 4-2-4z" fill="currentColor" opacity=".9"/><circle cx="20" cy="25" r="10" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M20 18l2.2 4.2 4.8.7-3.5 3.3.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.3 4.8-.7z" fill="currentColor"/></svg>;
}

export default function HomePage() {
  return (
    <main className="namaa-home" id="top">
      <header className="namaa-header">
        <a className="namaa-logo" href="#top" aria-label="واعي كيدز - الصفحة الرئيسية">
          <WaaiMark compact />
          <span><strong>واعي كيدز</strong><small>ينمو بوعي ويُنجز بثقة</small></span>
        </a>
        <nav className="namaa-nav" aria-label="التنقل الرئيسي">
          <a href="#features">المزايا</a>
          <a href="#how">كيف يعمل؟</a>
          <a href="#about">عن واعي كيدز</a>
        </nav>
        <div className="namaa-header-actions">
          <a className="namaa-login" href="/login"><span>👤</span> تسجيل الدخول</a>
          <a className="namaa-start" href="/register">ابدأ الآن</a>
        </div>
      </header>

      <section className="namaa-hero">
        <HeroCopyMotion />
        <div className="namaa-hero-art">
          <div className="hero-orbit-stage">
            <div className="hero-core">
              <img src="/assets/hero-child-namaa-bg.svg?v=20260627-3" alt="طفل سعيد يحمل كأس الإنجاز على خلفية متناسقة مع واعي كيدز" loading="eager" />
            </div>
            <div className="hero-orbit" aria-label="اختصارات تفاعلية">
              <a className="hero-orbit-item orbit-a orbit-green" href="#features" aria-label="عرض المزايا" title="المزايا"><span className="orbit-icon-inner"><span className="orbit-face"><ChartIcon /></span></span></a>
              <a className="hero-orbit-item orbit-b orbit-purple" href="#how" aria-label="كيف يعمل واعي كيدز" title="كيف يعمل واعي كيدز"><span className="orbit-icon-inner"><span className="orbit-face"><CheckIcon /></span></span></a>
              <a className="hero-orbit-item orbit-c orbit-blue" href="#about" aria-label="الأهداف والمتابعة" title="الأهداف والمتابعة"><span className="orbit-icon-inner"><span className="orbit-face"><TargetIcon /></span></span></a>
              <a className="hero-orbit-item orbit-d orbit-gold" href="/register" aria-label="ابدأ رحلة الإنجاز" title="ابدأ الآن"><span className="orbit-icon-inner"><span className="orbit-face"><MedalIcon /></span></span></a>
              <a className="hero-orbit-item orbit-e orbit-sky" href="/child/login" aria-label="دخول الطفل" title="دخول الطفل"><span className="orbit-icon-inner"><span className="orbit-face"><UserIcon /></span></span></a>
              <a className="hero-orbit-item orbit-f orbit-points" href="#features" aria-label="نظام النقاط" title="نظام النقاط"><span className="orbit-icon-inner"><span className="orbit-face"><strong>120</strong><span>⭐</span><small>نقاط اليوم</small></span></span></a>
            </div>
          </div>
        </div>
      </section>

      <FeaturesMotion features={features} />
      <HowStepsMotion steps={steps} />
      <AboutWaaiMotion />

      <section className="namaa-stats" aria-label="إحصاءات واعي كيدز">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.icon}</span>
            <div><strong>{stat.value}</strong><small>{stat.label}</small></div>
          </article>
        ))}
      </section>

      <section className="namaa-final-call">
        <div><span>✨ كل إنجاز صغير يصنع وعيًا كبيرًا</span><h2>ساعد طفلك على بناء عادات ومهارات تدوم</h2></div>
        <a href="/register">إنشاء حساب جديد</a>
      </section>

      <footer className="namaa-footer">
        <div className="namaa-logo"><WaaiMark compact /><span><strong>واعي كيدز</strong><small>منصة تربوية ذكية لتنمية الطفل</small></span></div>
        <p>waai-kids.com — ينمو بوعي ويُنجز بثقة</p>
      </footer>
    </main>
  );
}
