const features = [
  { icon: "🔒", title: "آمن وموثوق", description: "خصوصية عالية وصلاحيات مستقلة لكل فرد." },
  { icon: "👥", title: "متابعة ذكية", description: "تقارير توضح تقدم الأبناء والطلاب بسهولة." },
  { icon: "📋", title: "مهام يومية", description: "خطوات بسيطة تبني عادات عظيمة مع الوقت." },
  { icon: "🎯", title: "أهداف واضحة", description: "يختار الطفل هدفه ويعرف طريق الوصول إليه." },
  { icon: "⭐", title: "نظام نقاط ذكي", description: "تحفيز مستمر يربط الإنجاز بالمكافأة." }
];

const steps = [
  { number: "1", icon: "👨‍👩‍👦", title: "أنشئ حسابك", description: "سجّل كولي أمر أو معلم وأضف أبناءك أو طلابك في دقائق." },
  { number: "2", icon: "🎯", title: "حدد الأهداف والمهام", description: "أضف أهدافًا مناسبة وحدد المهام اليومية وخطط الحفظ." },
  { number: "3", icon: "🎁", title: "تابع الإنجاز وكافئهم", description: "راجع التقدم واعتمد الإنجازات وامنح المكافآت التشجيعية." }
];

const stats = [
  { icon: "👥", value: "+10,000", label: "أسرة تثق بنا" },
  { icon: "⭐", value: "+200,000", label: "مهمة مكتملة" },
  { icon: "✅", value: "+1,000,000", label: "نقطة تم منحها" },
  { icon: "💜", value: "+20,000", label: "هدف تم تحقيقه" }
];

function HeroMascot() {
  return (
    <svg className="namaa-mascot" viewBox="0 0 600 600" role="img" aria-label="طفل يرفع كأس الإنجاز">
      <defs>
        <linearGradient id="circleGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8f8b6" />
          <stop offset="0.55" stopColor="#b8ecaa" />
          <stop offset="1" stopColor="#ffe0bd" />
        </linearGradient>
        <linearGradient id="hoodie" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#15935c" />
          <stop offset="1" stopColor="#087445" />
        </linearGradient>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd8b5" />
          <stop offset="1" stopColor="#f2a16e" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1a6" />
          <stop offset="0.45" stopColor="#ffbf22" />
          <stop offset="1" stopColor="#e48708" />
        </linearGradient>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#173e31" floodOpacity="0.18" />
        </filter>
        <filter id="trophyShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#9b5f00" floodOpacity="0.22" />
        </filter>
      </defs>

      <circle cx="330" cy="310" r="245" fill="url(#circleGlow)" />
      <circle cx="455" cy="122" r="7" fill="#62c6ea" />
      <circle cx="530" cy="205" r="10" fill="#ffc22c" />
      <circle cx="106" cy="175" r="7" fill="#79d993" />
      <path d="M122 250l8 16 18 3-13 12 3 18-16-9-16 9 3-18-13-12 18-3z" fill="#ffd23d" />
      <path d="M510 335l7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#72cf78" />
      <path d="M418 78l5 11 13 2-10 9 3 13-11-6-11 6 2-13-9-9 13-2z" fill="#ffffff" opacity=".9" />

      <g filter="url(#trophyShadow)" transform="translate(74 82) rotate(-8 105 90)">
        <path d="M58 20h95v72c0 39-21 64-47 64S58 131 58 92z" fill="url(#gold)" stroke="#d88408" strokeWidth="6" />
        <path d="M58 36H30c-10 0-17 8-17 18 0 29 18 47 48 47" fill="none" stroke="#f0a714" strokeWidth="12" strokeLinecap="round" />
        <path d="M153 36h28c10 0 17 8 17 18 0 29-18 47-48 47" fill="none" stroke="#f0a714" strokeWidth="12" strokeLinecap="round" />
        <path d="M105 154v31" stroke="#c97c08" strokeWidth="13" strokeLinecap="round" />
        <path d="M70 190h70" stroke="#a96205" strokeWidth="18" strokeLinecap="round" />
        <path d="M105 48l11 23 25 4-18 17 4 25-22-12-22 12 4-25-18-17 25-4z" fill="#fff6af" stroke="#e7a21b" strokeWidth="4" />
      </g>

      <g filter="url(#softShadow)">
        <path d="M217 440c18-83 75-126 142-126 77 0 138 54 152 141l-3 70H205z" fill="url(#hoodie)" />
        <path d="M279 352c10 31 33 48 68 48 35 0 61-19 72-50l-7-41H288z" fill="#0c7b49" opacity=".62" />
        <path d="M272 347c-27-54-31-128 1-175 22-34 61-51 105-44 43 7 78 37 91 79 16 53-4 114-50 149-48 37-116 34-147-9z" fill="url(#skin)" />
        <ellipse cx="340" cy="267" rx="94" ry="105" fill="url(#skin)" />
        <path d="M250 239c-4-76 52-132 123-126 47 4 85 31 104 70-30-19-65-27-97-19-34 8-57 27-73 53-16-7-34 0-57 22z" fill="#3a2115" />
        <path d="M271 177c19-42 64-65 109-58 27 4 52 17 71 38-29-8-56-8-82-1-35 9-66 27-98 21z" fill="#5a2c18" />
        <ellipse cx="314" cy="263" rx="18" ry="24" fill="#ffffff" />
        <ellipse cx="389" cy="257" rx="18" ry="24" fill="#ffffff" />
        <ellipse cx="319" cy="267" rx="9" ry="13" fill="#4d2c14" />
        <ellipse cx="394" cy="261" rx="9" ry="13" fill="#4d2c14" />
        <circle cx="322" cy="263" r="3" fill="#ffffff" />
        <circle cx="397" cy="257" r="3" fill="#ffffff" />
        <path d="M304 227c12-10 26-12 40-6" stroke="#4b2818" strokeWidth="9" strokeLinecap="round" />
        <path d="M376 219c13-8 27-8 39 1" stroke="#4b2818" strokeWidth="9" strokeLinecap="round" />
        <path d="M340 281c4 8 9 11 16 8" stroke="#d47c5d" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M315 308c25 28 63 30 91 1-16 43-70 51-91-1z" fill="#7e251b" />
        <path d="M328 319c18 12 42 12 59 0" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
        <circle cx="286" cy="291" r="13" fill="#f2a17d" opacity=".7" />
        <circle cx="423" cy="286" r="13" fill="#f2a17d" opacity=".7" />
        <path d="M235 439c-31-43-42-85-27-124 10-27 30-45 56-56l36 39c-23 16-27 45-7 83z" fill="url(#hoodie)" />
        <path d="M258 281c-18-29-38-62-49-94-8-24 6-45 27-48 19-3 36 9 42 28l23 76z" fill="url(#skin)" />
        <path d="M211 156c15-18 36-20 50-4 10 11 8 31-4 42-13 12-35 10-47-3-10-11-10-24 1-35z" fill="url(#skin)" />
        <path d="M241 144c-9-14-17-31-20-47" stroke="#f2a16e" strokeWidth="13" strokeLinecap="round" />
        <path d="M232 144c-17-9-31-22-42-37" stroke="#f2a16e" strokeWidth="12" strokeLinecap="round" />
        <path d="M248 151c1-18 7-35 17-49" stroke="#f2a16e" strokeWidth="12" strokeLinecap="round" />
        <path d="M317 410c22 14 53 16 79 1" stroke="#56c685" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M320 405l-8 86M395 406l10 85" stroke="#0a633b" strokeWidth="7" strokeLinecap="round" />
        <circle cx="312" cy="492" r="7" fill="#d7f1df" />
        <circle cx="405" cy="492" r="7" fill="#d7f1df" />
      </g>
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="namaa-home" id="top">
      <header className="namaa-header">
        <a className="namaa-logo" href="#top" aria-label="نماء - الصفحة الرئيسية">
          <span className="namaa-logo-mark">ن</span>
          <span><strong>نماء</strong><small>ينمو بوعي وإيجابية</small></span>
        </a>

        <nav className="namaa-nav" aria-label="التنقل الرئيسي">
          <a href="#features">المزايا</a>
          <a href="#how">كيف يعمل؟</a>
          <a href="#about">عن نماء</a>
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
            <a className="namaa-entry parent" href="/login?type=family">
              <span className="entry-icon">👤</span>
              <span><strong>دخول ولي الأمر</strong><small>إدارة ومتابعة الأبناء</small></span>
            </a>
            <a className="namaa-entry child" href="/child/login">
              <span className="entry-icon">🧒🏻</span>
              <span><strong>دخول الطفل</strong><small>إنجاز المهام وكسب النقاط</small></span>
            </a>
            <a className="namaa-entry teacher" href="/login?type=teacher">
              <span className="entry-icon">👨‍🏫</span>
              <span><strong>دخول المعلم</strong><small>إدارة الحفظ ومركز التسميع</small></span>
            </a>
          </div>

          <div className="namaa-security">🔒 بياناتك آمنة ومشفرة</div>
        </div>

        <div className="namaa-hero-art" aria-hidden="true">
          <span className="hero-spark spark-one">✦</span>
          <span className="hero-spark spark-two">✦</span>
          <span className="hero-spark spark-three">✦</span>
          <HeroMascot />
          <div className="floating-badge badge-check">✓</div>
          <div className="floating-badge badge-target">🎯</div>
          <div className="hero-points-card">
            <small>نقاطي اليوم</small>
            <div><strong>120</strong><span>⭐</span></div>
            <i><b style={{ width: "72%" }} /></i>
          </div>
        </div>
      </section>

      <section className="namaa-features" id="features">
        {features.map((feature, index) => (
          <article key={feature.title} style={{ animationDelay: `${index * 70}ms` }}>
            <span>{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="namaa-how" id="how">
        <div className="namaa-section-heading">
          <span>🌱 خطوات بسيطة لبناء جيل متميز</span>
          <h2>كيف يعمل نماء؟</h2>
        </div>

        <div className="namaa-steps">
          {steps.map((step, index) => (
            <article className="namaa-step" key={step.number}>
              <b>{step.number}</b>
              <div className={`step-art step-art-${index + 1}`}>{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              {index < steps.length - 1 && <span className="namaa-step-arrow">←</span>}
            </article>
          ))}
        </div>

        <a className="namaa-journey" href="/register">🚀 ابدأ رحلتكم الآن</a>
      </section>

      <section className="namaa-about" id="about">
        <div><span>عن نماء</span><h2>منصة واحدة تجمع الأسرة والطفل والمعلم</h2></div>
        <p>تجمع نماء الأهداف والمهام والتحفيز وحفظ القرآن في تجربة بسيطة، مع فصل واضح بين دور ولي الأمر ودور المعلم، وتمكين الطفل من متابعة تقدمه بثقة ووضوح.</p>
      </section>

      <section className="namaa-stats" aria-label="إحصاءات نماء">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.icon}</span>
            <div><strong>{stat.value}</strong><small>{stat.label}</small></div>
          </article>
        ))}
      </section>

      <section className="namaa-final-call">
        <div><span>✨ ابدأ بخطوة صغيرة اليوم</span><h2>ساعد أبناءك وطلابك على بناء عادات تدوم</h2></div>
        <a href="/register">إنشاء حساب جديد</a>
      </section>

      <footer className="namaa-footer">
        <div className="namaa-logo"><span className="namaa-logo-mark">ن</span><span><strong>نماء</strong><small>منصة تربوية تعليمية</small></span></div>
        <p>الإصدار التجريبي للأسرة والطفل والمعلم</p>
      </footer>
    </main>
  );
}
