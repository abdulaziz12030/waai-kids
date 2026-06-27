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
.namaa-hero-illustration{width:min(100%,520px);height:auto;display:block;position:relative;z-index:3;object-fit:contain;filter:drop-shadow(0 22px 26px rgba(45,75,59,.12));animation:namaa-mascot-float 4.2s ease-in-out infinite}
@media(max-width:760px){
.namaa-hero-art{min-height:330px!important;padding:6px 0 0!important}
.namaa-hero-illustration{width:min(96%,360px);margin-inline:auto}
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
@media(max-width:370px){.namaa-stats{width:calc(100% - 12px)!important;gap:7px!important;padding:3px!important}.namaa-stats article,.namaa-stats article:last-child{min-height:100px!important;padding:10px 7px!important;grid-template-columns:36px minmax(0,1fr)!important;gap:6px!important;border-radius:15px!important}.namaa-stats article>span{width:36px!important;height:36px!important;font-size:18px!important}.namaa-stats article strong{font-size:12px!important}.namaa-stats article small{font-size:8px!important}}
`;

export default function HomePage() {
  return (
    <main className="namaa-home" id="top">
      <style>{landingOverrides}</style>
      <header className="namaa-header">
        <a className="namaa-logo" href="#top" aria-label="نماء - الصفحة الرئيسية">
          <span className="namaa-logo-mark">ن</span>
          <span><strong>نماء</strong><small>ينمو بوعي وإيجابية</small></span>
        </a>
        <nav className="namaa-nav" aria-label="التنقل الرئيسي">
          <a href="#features">المزايا</a><a href="#how">كيف يعمل؟</a><a href="#about">عن نماء</a>
        </nav>
        <div className="namaa-header-actions">
          <a className="namaa-login" href="/login"><span>👤</span> تسجيل الدخول</a>
          <a className="namaa-start" href="/register">ابدأ الآن</a>
        </div>
      </header>

      <section className="namaa-hero">
        <div className="namaa-hero-copy">
          <span className="namaa-eyebrow">💚 منصة تربوية إسلامية للعائلة والمعلم</span>
          <h1>نساعد أطفالك<br />على <span>النمو</span> و<strong>الإنجاز</strong></h1>
          <p>نماء منصة تساعدك على بناء عادات إيجابية لدى أطفالك من خلال الأهداف والمهام والنقاط بطريقة ممتعة وهادفة، مع متابعة الأسرة والمعلم.</p>
          <div className="namaa-entry-grid">
            <a className="namaa-entry parent" href="/login?type=family"><span className="entry-icon">👤</span><span><strong>دخول ولي الأمر</strong><small>إدارة ومتابعة الأبناء</small></span></a>
            <a className="namaa-entry child" href="/child/login"><span className="entry-icon">🧒🏻</span><span><strong>دخول الطفل</strong><small>إنجاز المهام وكسب النقاط</small></span></a>
            <a className="namaa-entry teacher" href="/login?type=teacher"><span className="entry-icon">👨‍🏫</span><span><strong>دخول المعلم</strong><small>إدارة الحفظ ومركز التسميع</small></span></a>
          </div>
          <div className="namaa-security">🔒 بياناتك آمنة ومشفرة</div>
        </div>
        <div className="namaa-hero-art">
          <img className="namaa-hero-illustration" src="https://raw.githubusercontent.com/abdulaziz12030/namaa/assets-approved-hero/public/assets/hero-child.webp" alt="طفل يرفع كأس الإنجاز" loading="eager" />
        </div>
      </section>

      <section className="namaa-features" id="features">{features.map((feature,index)=><article key={feature.title} style={{animationDelay:`${index*70}ms`}}><span>{feature.icon}</span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</section>

      <section className="namaa-how" id="how">
        <div className="namaa-section-heading"><span>🌱 خطوات بسيطة لبناء جيل متميز</span><h2>كيف يعمل نماء؟</h2></div>
        <div className="namaa-steps">{steps.map((step,index)=><article className="namaa-step" key={step.number}><b>{step.number}</b><div className={`step-art step-art-${index+1}`}>{step.icon}</div><h3>{step.title}</h3><p>{step.description}</p>{index<steps.length-1&&<span className="namaa-step-arrow">←</span>}</article>)}</div>
        <a className="namaa-journey" href="/register">🚀 ابدأ رحلتكم الآن</a>
      </section>

      <section className="namaa-about" id="about"><div><span>عن نماء</span><h2>منصة واحدة تجمع الأسرة والطفل والمعلم</h2></div><p>تجمع نماء الأهداف والمهام والتحفيز وحفظ القرآن في تجربة بسيطة، مع فصل واضح بين دور ولي الأمر ودور المعلم، وتمكين الطفل من متابعة تقدمه بثقة ووضوح.</p></section>

      <section className="namaa-stats" aria-label="إحصاءات نماء">{stats.map(stat=><article key={stat.label}><span>{stat.icon}</span><div><strong>{stat.value}</strong><small>{stat.label}</small></div></article>)}</section>

      <section className="namaa-final-call"><div><span>✨ ابدأ بخطوة صغيرة اليوم</span><h2>ساعد أبناءك وطلابك على بناء عادات تدوم</h2></div><a href="/register">إنشاء حساب جديد</a></section>
      <footer className="namaa-footer"><div className="namaa-logo"><span className="namaa-logo-mark">ن</span><span><strong>نماء</strong><small>منصة تربوية تعليمية</small></span></div><p>الإصدار التجريبي للأسرة والطفل والمعلم</p></footer>
    </main>
  );
}
