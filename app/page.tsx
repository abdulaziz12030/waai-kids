const features = [
  {
    title: "الأهداف",
    description: "ساعد ابنك على اختيار هدف واضح، ثم قسّمه إلى خطوات صغيرة قابلة للإنجاز."
  },
  {
    title: "المهام والنقاط",
    description: "حوّل العادات والمهام اليومية إلى نقاط وإنجازات بسيطة ومشجعة."
  },
  {
    title: "القرآن",
    description: "نظّم الحفظ والمراجعة والتسميع، وتابع التقدم بطريقة سهلة وواضحة."
  },
  {
    title: "المكافآت",
    description: "اربط الإنجاز بمكافأة عادلة مع إمكانية الصرف أو الجدولة أو التأجيل."
  }
];

const steps = [
  {
    title: "أنشئ الأسرة",
    description: "يسجل ولي الأمر حسابه ويضيف أبناءه في دقائق."
  },
  {
    title: "حدد الهدف",
    description: "اختر هدفًا أو مهمة أو خطة حفظ مناسبة لكل ابن."
  },
  {
    title: "تابع الإنجاز",
    description: "اعتمد المهام والتسميع وأضف النقاط عند الإنجاز."
  },
  {
    title: "كافئ بوضوح",
    description: "تظهر المكافأة المستحقة ويُحدد وقت تسليمها بوضوح."
  }
];

const audiences = [
  {
    title: "للأسرة الآن",
    description: "لوحة بسيطة لولي الأمر والأبناء، وهي أول نسخة معتمدة من نماء."
  },
  {
    title: "للمعلم لاحقًا",
    description: "متابعة الحفظ والتسميع دون الاطلاع على بيانات الأسرة الخاصة."
  },
  {
    title: "للحلقات والمدارس مستقبلًا",
    description: "إدارة مجموعات ومعلمين وطلاب وصلاحيات من نفس الأساس التقني."
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
          <a href="#how">كيف يعمل؟</a>
          <a href="#pricing">الاشتراك</a>
        </nav>

        <div className="header-actions">
          <span className="header-status">نسخة تجريبية</span>
          <a className="header-button" href="#start">ابدأ قريبًا</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-content">
          <span className="eyebrow">نمو هادئ بخطوات واضحة</span>
          <h1>نساعد أبناءنا على بناء العادات وتحقيق الأهداف بثقة.</h1>
          <p>
            نماء منصة تربوية تعليمية تجمع الأهداف والقرآن والمهام والنقاط
            والمكافآت في تجربة واحدة بسيطة وهادئة للأسرة.
          </p>

          <div className="hero-actions" id="start">
            <a className="primary-button" href="#pricing">
              تعرّف على النسخة الأولى
            </a>
            <a className="secondary-button" href="#how">
              كيف يعمل نماء؟
            </a>
          </div>

          <div className="hero-note">
            <span>•</span>
            <p>نبدأ بالأسرة، ثم نضيف المعلم والحلقات والمدارس تدريجيًا.</p>
          </div>
        </div>

        <div className="hero-card" aria-label="نموذج بطاقة إنجاز">
          <div className="hero-card-head">
            <div>
              <span className="card-kicker">ملخص أسبوعي</span>
              <h2>تقدّم عمر</h2>
            </div>
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
          <div className="card-footer-row">
            <span>الرصيد الحالي</span>
            <strong>420 نقطة</strong>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <div>
          <span className="section-label">عن نماء</span>
          <h2>ليس تطبيقًا للمكافآت فقط، بل مساحة للنمو.</h2>
        </div>
        <div className="about-copy">
          <p>
            يساعد نماء الطفل على الصبر والتخطيط وتحمل المسؤولية، ويمنح ولي
            الأمر طريقة هادئة للمتابعة والتحفيز دون تعقيد.
          </p>
          <p>
            الهدف هو أن يفهم الطفل العلاقة بين الجهد والإنجاز، لا أن تتحول كل
            مهمة إلى مقابل مالي.
          </p>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <span className="section-label">النسخة الأولى</span>
          <h2>أساس واضح للأسرة</h2>
          <p>نبدأ بالمزايا الأكثر فائدة، ثم نضيف البقية بعد اختبار التجربة.</p>
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

      <section className="how-section" id="how">
        <div className="section-heading centered-heading">
          <span className="section-label">كيف يعمل؟</span>
          <h2>أربع خطوات بسيطة</h2>
          <p>تجربة سهلة لولي الأمر، وواضحة للطفل.</p>
        </div>

        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span className="step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="audience-section">
        <div className="section-heading">
          <span className="section-label">توسع مدروس</span>
          <h2>منصة واحدة تتوسع تدريجيًا</h2>
          <p>البنية واحدة، لكن كل فئة ترى ما يناسب صلاحياتها فقط.</p>
        </div>

        <div className="audience-grid">
          {audiences.map((audience) => (
            <article className="audience-card" key={audience.title}>
              <h3>{audience.title}</h3>
              <p>{audience.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="pricing-copy">
          <span className="section-label">الاشتراك المقترح</span>
          <h2>باقة أسرة بسيطة وواضحة</h2>
          <p>
            سيتم تفعيل الاشتراكات بعد اكتمال الوظائف الأساسية وتجربة النسخة
            الأولى مع عدد محدود من الأسر.
          </p>
        </div>

        <article className="pricing-card">
          <span className="pricing-badge">نسخة الأسرة</span>
          <div className="price-row">
            <strong>19</strong>
            <div>
              <span>ريال</span>
              <p>شهريًا</p>
            </div>
          </div>
          <p className="annual-price">أو 149 ريال سنويًا</p>
          <ul>
            <li>حتى 6 أبناء</li>
            <li>ولي أمر إضافي</li>
            <li>الأهداف والمهام والنقاط</li>
            <li>القرآن والمكافآت</li>
          </ul>
          <button className="pricing-button" type="button" disabled>
            التسجيل يفتح قريبًا
          </button>
        </article>
      </section>

      <section className="next-step-section">
        <div>
          <span className="section-label">المرحلة التالية</span>
          <h2>تسجيل ولي الأمر وإنشاء الأسرة</h2>
        </div>
        <p>
          الخطوة القادمة هي إنشاء صفحات التسجيل والدخول، ثم ربط الحساب بالأسرة
          وإضافة الأبناء من Supabase.
        </p>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark small">ن</span>
          <div>
            <strong>نماء</strong>
            <p>منصة تربوية تعليمية للأطفال والطلاب.</p>
          </div>
        </div>
        <p>الإصدار التجريبي للأسرة</p>
      </footer>
    </main>
  );
}
