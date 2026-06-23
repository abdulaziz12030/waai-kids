import Link from "next/link";

export default function ChildEntryCard() {
  return (
    <section className="child-entry-section" aria-labelledby="child-entry-title">
      <div className="child-entry-copy">
        <span className="section-label">دخول مستقل للطفل</span>
        <h2 id="child-entry-title">واجهة مبسطة وآمنة بدون صلاحيات ولي الأمر</h2>
        <p>
          يدخل الطفل برمز الأسرة ورمز الطفل والرمز السري، ثم يرى أهدافه وتقدمه
          ويطلب هدفًا جديدًا فقط.
        </p>
        <div className="child-entry-steps" aria-label="خطوات دخول الطفل">
          <span><strong>1</strong> رمز الأسرة</span>
          <span><strong>2</strong> رمز الطفل</span>
          <span><strong>3</strong> الرمز السري</span>
        </div>
      </div>

      <div className="child-entry-action-card">
        <div className="child-entry-icon" aria-hidden="true">🌱</div>
        <h3>مرحبًا بك في نماء</h3>
        <p>ادخل إلى حسابك المحدود وتابع أهدافك بنفسك.</p>
        <Link className="child-entry-button" href="/child/login">
          دخول الطفل
        </Link>
        <small>بيانات الدخول يعطيك إياها ولي الأمر.</small>
      </div>
    </section>
  );
}
