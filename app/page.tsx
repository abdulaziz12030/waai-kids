const features = [
  {
    title: "الأهداف",
    description: "ساعد ابنك على التخطيط لهدف واضح والوصول إليه خطوة بخطوة."
  },
  {
    title: "المهام والنقاط",
    description: "حوّل العادات والمهام اليومية إلى إنجازات بسيطة ومشجعة."
  },
  {
    title: "القرآن",
    description: "نظّم الحفظ والمراجعة والتسميع بطريقة سهلة وواضحة."
  },
  {
    title: "المكافآت",
    description: "اربط الإنجاز بمكافأة عادلة مع إمكانية الجدولة أو التأجيل."
  }
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="نماء - الصفحة الرئيسية">
          <span className="brand-mark">ن</span>
          <span>نماء</span>
        </a>

        <nav className="nav-links" aria-label="التنقل الرئيسي">
          <a href="#about">عن نماء</a>
          <a href="#features">المزايا</a>
          <a href="#start">البدء</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-content">
          <span className="eyebrow">نمو هادئ بخطوات واضحة</span>
          <h1>نبني العادات، ونشجّع الإنجاز، ونرافق أبناءنا نحو مستقبل أفضل.</h1>
          <p>
            نماء منصة تربوية تعليمية تساعد الأسرة على تنظيم الأهداف والقرآن
            والمهام والنقاط والمكافآت في مكان واحد بسيط.
          </p>

          <div className="hero-actions" id="start">
            <button className="primary-button" type="button" disabled>
              إنشاء حساب قريبًا
            </button>
            <a className="secondary-button" href="#features">
              استكشف الفكرة
            </a>
          </div>
        </div>

        <div className="hero-card" aria-label="نموذج بطاقة إنجاز">
          <div className="hero-card-head">
            <span>تقدّم هذا الأسبوع</span>
            <strong>72٪</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span className="progress-value" />
          </div>
          <div className="mini-list">
            <div>
              <span className="mini-icon">✓</span>
              <p>تمت مراجعة سورة الملك</p>
            </div>
            <div>
              <span className="mini-icon">✓</span>
              <p>اكتملت 4 مهام تربوية</p>
            </div>
            <div>
              <span className="mini-icon muted">•</span>
              <p>تبقى 80 نقطة للهدف القادم</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <div>
          <span className="section-label">عن نماء</span>
          <h2>ليس تطبيقًا للمال فقط، بل مساحة للنمو.</h2>
        </div>
        <p>
          يساعد نماء الطفل على الصبر والتخطيط وتحمل المسؤولية، ويمنح ولي
          الأمر طريقة هادئة للمتابعة والتحفيز دون تعقيد.
        </p>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <span className="section-label">المرحلة الأولى</span>
          <h2>أساس بسيط للأسرة</h2>
          <p>نبدأ بالمهم، ثم نضيف المزايا تدريجيًا بعد اختبارها.</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-number">0{index + 1}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="next-step-section">
        <div>
          <span className="section-label">الخطوة التالية</span>
          <h2>تسجيل ولي الأمر وإنشاء الأسرة</h2>
        </div>
        <p>
          بعد اكتمال الأساس التقني سنبدأ مباشرة بإنشاء الحساب، ثم إضافة الأبناء
          ولوحة الأسرة.
        </p>
      </section>

      <footer>
        <span>نماء</span>
        <p>منصة تربوية تعليمية للأطفال والطلاب.</p>
      </footer>
    </main>
  );
}
