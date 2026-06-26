const features = [
  { icon: "🔒", title: "آمن وموثوق", description: "خصوصية عالية وصلاحيات منفصلة لكل فرد." },
  { icon: "👨‍👩‍👧‍👦", title: "متابعة ذكية", description: "ملخص واضح لتقدم الأبناء ومهامهم." },
  { icon: "📋", title: "مهام يومية", description: "مهام بسيطة تبني العادات خطوة بخطوة." },
  { icon: "🎯", title: "أهداف واضحة", description: "يختار الطفل هدفه ويعمل عليه بوضوح." },
  { icon: "⭐", title: "نقاط محفزة", description: "نظام إنجاز ومكافآت يشجع الاستمرار." }
];

const steps = [
  { number: "1", icon: "👨‍👩‍👧", title: "أنشئ حسابك", description: "سجل كولي أمر أو معلم، ثم اربط الأبناء والطلاب." },
  { number: "2", icon: "🎯", title: "حدد الأهداف والمهام", description: "اختر هدفًا واضحًا وحدد المهام وخطط الحفظ المناسبة." },
  { number: "3", icon: "🎁", title: "تابع الإنجاز وكافئهم", description: "يتابع ولي الأمر النتائج، ويقيّم المعلم الحفظ والتسميع." }
];

export default function HomePage() {
  return (
    <main className="landing-v2" id="top">
      <header className="landing-header">
        <a className="landing-brand" href="#top" aria-label="نماء - الصفحة الرئيسية">
          <span className="landing-brand-icon">🌿</span>
          <span><strong>نماء</strong><small>ينمو بوعي وإيجابية</small></span>
        </a>

        <nav className="landing-nav" aria-label="التنقل الرئيسي">
          <a href="#features">المزايا</a>
          <a href="#how">كيف يعمل؟</a>
          <a href="#about">عن نماء</a>
        </nav>

        <div className="landing-actions">
          <a className="landing-login" href="/login">تسجيل الدخول</a>
          <a className="landing-start" href="/register">ابدأ الآن</a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">💚 منصة تربوية إسلامية للعائلة والمعلم</span>
          <h1>نساعد أبناءك<br />على <span>النمو</span> و<strong>الإنجاز</strong></h1>
          <p>نماء منصة تجمع الأسرة والطفل والمعلم لبناء العادات، ومتابعة الأهداف والمهام وحفظ القرآن بطريقة ممتعة وهادفة.</p>

          <div className="landing-role-actions">
            <a className="parent-entry" href="/login?type=family">
              <span>👤</span>
              <div><strong>دخول ولي الأمر</strong><small>متابعة الأبناء والنتائج</small></div>
            </a>
            <a className="child-entry" href="/child/login">
              <span>🧒</span>
              <div><strong>دخول الطفل</strong><small>إنجاز المهام وكسب النقاط</small></div>
            </a>
            <a className="teacher-entry" href="/login?type=teacher">
              <span>👨‍🏫</span>
              <div><strong>دخول المعلم</strong><small>إدارة الحفظ ومركز التسميع</small></div>
            </a>
          </div>

          <div className="landing-security-note">🔒 بياناتك آمنة ومشفرة</div>
        </div>

        <div className="landing-hero-visual" aria-label="طفل يحقق إنجازًا">
          <div className="visual-orbit orbit-one">✓</div>
          <div className="visual-orbit orbit-two">🎯</div>
          <div className="visual-orbit orbit-three">⭐</div>
          <div className="visual-glow" />
          <div className="hero-child">🧒🏻</div>
          <div className="hero-trophy">🏆</div>
          <div className="points-card">
            <small>نقاطي اليوم</small>
            <strong>120 ⭐</strong>
            <span><i style={{ width: "72%" }} /></span>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        {features.map((feature, index) => (
          <article key={feature.title} style={{ animationDelay: `${index * 80}ms` }}>
            <span>{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="landing-how" id="how">
        <div className="landing-section-head">
          <span>🌱 خطوات بسيطة لبناء جيل متميز</span>
          <h2>كيف يعمل نماء؟</h2>
        </div>

        <div className="landing-steps">
          {steps.map((step, index) => (
            <article key={step.number} className="landing-step">
              <b>{step.number}</b>
              <div className="step-visual">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              {index < steps.length - 1 && <span className="step-arrow">←</span>}
            </article>
          ))}
        </div>

        <a className="landing-journey" href="/register">🚀 ابدأ رحلتكم الآن</a>
      </section>

      <section className="landing-about" id="about">
        <div>
          <span className="landing-eyebrow">عن نماء</span>
          <h2>أكثر من تطبيق نقاط</h2>
        </div>
        <p>نماء مساحة تربوية تجمع الطفل وولي الأمر والمعلم، وتوضح العلاقة بين الجهد والإنجاز والحفظ والمتابعة دون تعقيد.</p>
      </section>

      <section className="landing-final-cta">
        <div><span>✨ ابدأ بخطوة صغيرة اليوم</span><h2>ساعد أبناءك وطلابك على بناء عادات تدوم</h2></div>
        <a href="/register">إنشاء حساب جديد</a>
      </section>

      <footer className="landing-footer">
        <div className="landing-brand"><span className="landing-brand-icon">🌿</span><span><strong>نماء</strong><small>منصة تربوية تعليمية</small></span></div>
        <p>الإصدار التجريبي للأسرة والمعلم</p>
      </footer>
    </main>
  );
}
