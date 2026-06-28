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

const landingOverrides = `
.namaa-hero-art{overflow:visible!important}
.hero-orbit-stage{width:min(100%,560px);aspect-ratio:1;position:relative;display:grid;place-items:center;margin-inline:auto;isolation:isolate}
.hero-orbit-stage::before{content:"";position:absolute;inset:7%;border:1.5px solid rgba(54,170,101,.18);border-radius:50%;background:radial-gradient(circle at 50% 45%,rgba(210,247,188,.72),rgba(255,244,207,.34) 58%,transparent 59%);box-shadow:0 24px 60px rgba(35,80,57,.08);z-index:0}
.hero-orbit-stage::after{content:"";position:absolute;inset:2%;border-radius:50%;background:conic-gradient(from 20deg,rgba(77,202,120,.16),rgba(102,184,255,.16),rgba(151,104,242,.14),rgba(255,197,63,.18),rgba(77,202,120,.16));filter:blur(20px);opacity:.55;z-index:-1}
.hero-core{width:72%;height:72%;position:relative;z-index:3;overflow:hidden;border-radius:50%;border:8px solid rgba(255,255,255,.92);background:linear-gradient(145deg,#e6f9d9,#fff6d7);box-shadow:0 24px 54px rgba(25,87,53,.16),inset 0 0 0 1px rgba(32,139,79,.08);display:grid;place-items:center}
.hero-core img{width:100%;height:100%;display:block;object-fit:cover;object-position:center center;transform:scale(1.01);transition:transform .45s ease;filter:saturate(1.04) contrast(1.02)}
.hero-orbit-stage:hover .hero-core img,.hero-orbit-stage:focus-within .hero-core img{transform:scale(1.04)}
.hero-orbit{position:absolute;inset:0;z-index:5;border-radius:50%;animation:hero-orbit-clockwise 18s linear infinite;transform-origin:center}
.hero-orbit-item{--angle:0deg;--neg-angle:0deg;position:absolute;top:50%;left:50%;width:66px;height:66px;display:grid;place-items:center;transform:translate(-50%,-50%) rotate(var(--angle)) translateX(232px) rotate(var(--neg-angle));border-radius:50%;text-decoration:none;outline:none}
.hero-orbit-item.orbit-a{--angle:0deg;--neg-angle:0deg}
.hero-orbit-item.orbit-b{--angle:60deg;--neg-angle:-60deg}
.hero-orbit-item.orbit-c{--angle:120deg;--neg-angle:-120deg}
.hero-orbit-item.orbit-d{--angle:180deg;--neg-angle:-180deg}
.hero-orbit-item.orbit-e{--angle:240deg;--neg-angle:-240deg}
.hero-orbit-item.orbit-f{--angle:300deg;--neg-angle:-300deg}
.orbit-icon-inner{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;animation:hero-orbit-counter 18s linear infinite;transform-origin:center}
.orbit-face{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;border:4px solid rgba(255,255,255,.88);box-shadow:0 14px 30px rgba(32,64,49,.16),inset 0 0 0 1px rgba(255,255,255,.5);transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;overflow:hidden}
.orbit-face svg{width:31px;height:31px;display:block}
.orbit-green .orbit-face{background:linear-gradient(145deg,#8ee47f,#4ebf5d);color:#fff}
.orbit-purple .orbit-face{background:linear-gradient(145deg,#a98af8,#7954e8);color:#fff}
.orbit-blue .orbit-face{background:linear-gradient(145deg,#75b5ff,#3678ea);color:#fff}
.orbit-gold .orbit-face{background:linear-gradient(145deg,#ffe47d,#ffb521);color:#fff}
.orbit-sky .orbit-face{background:linear-gradient(145deg,#75ccff,#3a8cf3);color:#fff}
.hero-orbit-item.orbit-points{width:96px;height:62px}
.orbit-points .orbit-face{border-radius:18px;background:rgba(255,255,255,.96);color:#173e31;padding:8px 11px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:5px;box-shadow:0 14px 32px rgba(32,64,49,.15)}
.orbit-points strong{font-size:20px;line-height:1;direction:ltr}
.orbit-points span{font-size:22px}
.orbit-points small{grid-column:1/-1;color:#6d7972;font-size:8px;font-weight:900}
.hero-orbit-item:hover .orbit-face,.hero-orbit-item:focus-visible .orbit-face{transform:scale(1.14);box-shadow:0 18px 38px rgba(30,71,49,.24),0 0 0 6px rgba(255,255,255,.7);filter:saturate(1.08)}
.hero-orbit-item:focus-visible{outline:3px solid rgba(20,141,82,.32);outline-offset:7px}
.hero-orbit-stage:hover .hero-orbit,.hero-orbit-stage:focus-within .hero-orbit,.hero-orbit-stage:hover .orbit-icon-inner,.hero-orbit-stage:focus-within .orbit-icon-inner{animation-play-state:paused}
@keyframes hero-orbit-clockwise{to{transform:rotate(360deg)}}
@keyframes hero-orbit-counter{to{transform:rotate(-360deg)}}
@media(max-width:760px){
.namaa-hero-art{min-height:390px!important;padding:8px 0 0!important}
.hero-orbit-stage{width:min(100%,370px)}
.hero-core{width:72%;height:72%;border-width:6px}
.hero-core img{object-fit:cover;object-position:center center;transform:scale(1.01)}
.hero-orbit-item{width:54px;height:54px;transform:translate(-50%,-50%) rotate(var(--angle)) translateX(151px) rotate(var(--neg-angle))}
.orbit-face{border-width:3px}
.orbit-face svg{width:25px;height:25px}
.hero-orbit-item.orbit-points{width:82px;height:54px}
.orbit-points .orbit-face{padding:7px 9px;border-radius:15px}
.orbit-points strong{font-size:17px}
.orbit-points span{font-size:19px}
.orbit-points small{font-size:7px}
.namaa-stats{width:calc(100% - 20px)!important;margin-top:26px!important;padding:6px!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
.namaa-stats::before{display:none!important}
.namaa-stats article,.namaa-stats article:last-child{min-width:0!important;min-height:106px!important;padding:12px 9px!important;display:grid!important;grid-template-columns:42px minmax(0,1fr)!important;align-items:center!important;justify-content:stretch!important;gap:8px!important;border:1px solid #e3ebe6!important;border-radius:18px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 10px 24px rgba(39,65,52,.08)!important}
.namaa-stats article:nth-child(odd){transform:translateX(72px) scale(.94)}
.namaa-stats article:nth-child(even){transform:translateX(-72px) scale(.94)}
.namaa-stats article>span{width:42px!important;height:42px!important;flex:none!important;border-radius:14px!important;font-size:21px!important}
.namaa-stats article div{min-width:0!important;align-items:flex-start!important;text-align:right!important}
.namaa-stats article strong{min-width:0!important;width:100%!important;font-size:clamp(13px,4vw,16px)!important;line-height:1.2!important}
.namaa-stats article small{font-size:9px!important;line-height:1.45!important;white-space:normal!important}
.namaa-stats.stats-visible article:nth-child(1),.namaa-stats.stats-visible article:nth-child(3){animation-name:namaa-stat-enter-mobile-right!important}
.namaa-stats.stats-visible article:nth-child(2),.namaa-stats.stats-visible article:nth-child(4){animation-name:namaa-stat-enter-mobile-left!important}
}
@media(max-width:390px){
.hero-orbit-stage{width:min(100%,334px)}
.hero-orbit-item{width:49px;height:49px;transform:translate(-50%,-50%) rotate(var(--angle)) translateX(136px) rotate(var(--neg-angle))}
.hero-orbit-item.orbit-points{width:76px;height:50px}
.namaa-stats{width:calc(100% - 12px)!important;gap:7px!important;padding:3px!important}
.namaa-stats article,.namaa-stats article:last-child{min-height:100px!important;padding:10px 7px!important;grid-template-columns:36px minmax(0,1fr)!important;gap:6px!important;border-radius:15px!important}
.namaa-stats article>span{width:36px!important;height:36px!important;font-size:18px!important}
.namaa-stats article strong{font-size:12px!important}
.namaa-stats article small{font-size:8px!important}
}
@media(prefers-reduced-motion:reduce){.hero-orbit,.orbit-icon-inner{animation:none!important}.hero-core img{transition:none!important}}
`;

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
      <style>{landingOverrides}</style>
      <header className="namaa-header">
        <a className="namaa-logo" href="#top" aria-label="واعي كيدز - الصفحة الرئيسية">
          <span className="namaa-logo-mark">و</span>
          <span><strong>واعي كيدز</strong><small>ينمو بوعي ويُنجز بثقة</small></span>
        </a>
        <nav className="namaa-nav" aria-label="التنقل الرئيسي">
          <a href="#features">المزايا</a><a href="#how">كيف يعمل؟</a><a href="#about">عن واعي كيدز</a>
        </nav>
        <div className="namaa-header-actions">
          <a className="namaa-login" href="/login"><span>👤</span> تسجيل الدخول</a>
          <a className="namaa-start" href="/register">ابدأ الآن</a>
        </div>
      </header>

      <section className="namaa-hero">
        <div className="namaa-hero-copy">
          <span className="namaa-eyebrow">💚 منصة تربوية ذكية للأسرة والطفل والمعلم</span>
          <h1>نزرع الوعي<br />ونحوّل <span>الأهداف</span> إلى <strong>إنجاز</strong></h1>
          <p>واعي كيدز منصة تربوية ذكية تساعد الأسرة والمعلم على تنمية وعي الطفل، وبناء عاداته الإيجابية، وتحقيق أهدافه، ومتابعة حفظه للقرآن، وتحفيزه بالمكافآت والهدايا الهادفة.</p>
          <div className="namaa-entry-grid">
            <a className="namaa-entry parent" href="/login?type=family"><span className="entry-icon">👤</span><span><strong>دخول ولي الأمر</strong><small>إدارة ومتابعة الأبناء</small></span></a>
            <a className="namaa-entry child" href="/child/login"><span className="entry-icon">🧒🏻</span><span><strong>دخول الطفل</strong><small>إنجاز المهام وكسب النقاط</small></span></a>
            <a className="namaa-entry teacher" href="/login?type=teacher"><span className="entry-icon">👨‍🏫</span><span><strong>دخول المعلم</strong><small>إدارة الحفظ ومركز التسميع</small></span></a>
          </div>
          <div className="namaa-security">🔒 بياناتك آمنة ومشفرة</div>
        </div>

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

      <section className="namaa-features" id="features">{features.map((feature,index)=><article key={feature.title} style={{animationDelay:`${index*70}ms`}}><span>{feature.icon}</span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</section>

      <section className="namaa-how" id="how">
        <div className="namaa-section-heading"><span>🌱 خطوات بسيطة لبناء طفل واعٍ وواثق</span><h2>كيف يعمل واعي كيدز؟</h2></div>
        <div className="namaa-steps">{steps.map((step,index)=><article className="namaa-step" key={step.number}><b>{step.number}</b><div className={`step-art step-art-${index+1}`}>{step.icon}</div><h3>{step.title}</h3><p>{step.description}</p>{index<steps.length-1&&<span className="namaa-step-arrow">←</span>}</article>)}</div>
        <a className="namaa-journey" href="/register">🚀 ابدأ رحلة طفلك الآن</a>
      </section>

      <section className="namaa-about" id="about"><div><span>عن واعي كيدز</span><h2>رحلة تربوية تجمع الأسرة والطفل والمعلم</h2></div><p>يجمع واعي كيدز الأهداف والمهام والتحفيز وحفظ القرآن في تجربة واحدة ممتعة، مع أدوار واضحة للأسرة والمعلم، ومساحة آمنة تمكّن الطفل من رؤية تقدمه والاعتزاز بإنجازاته.</p></section>

      <section className="namaa-stats" aria-label="إحصاءات واعي كيدز">{stats.map(stat=><article key={stat.label}><span>{stat.icon}</span><div><strong>{stat.value}</strong><small>{stat.label}</small></div></article>)}</section>

      <section className="namaa-final-call"><div><span>✨ كل إنجاز صغير يصنع وعيًا كبيرًا</span><h2>ساعد طفلك على بناء عادات ومهارات تدوم</h2></div><a href="/register">إنشاء حساب جديد</a></section>
      <footer className="namaa-footer"><div className="namaa-logo"><span className="namaa-logo-mark">و</span><span><strong>واعي كيدز</strong><small>منصة تربوية ذكية لتنمية الطفل</small></span></div><p>kids.waai.sa — ينمو بوعي ويُنجز بثقة</p></footer>
    </main>
  );
}
