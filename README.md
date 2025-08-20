# waai-kids (static v0)

موقع أولي جاهز للنشر على Vercel. لاحقًا يمكن تحويله إلى Next.js مع سلة ودفع.

## النشر على Vercel (Static)
1) أنشئ مستودع GitHub جديد باسم `waai-kids`.
2) انسخ ملفات هذا المجلد وضعها في المستودع.
3) في Vercel: New Project → Import من GitHub → اختر المستودع.
4) إطار: **Other** (static) – لا حاجة لأوامر build.
5) اضبط **Output Directory** على `/`.
6) انشر.

> محارف عربية مدعومة عبر Google Fonts (Cairo / Readex Pro).

## هيكلة
- `index.html`, `products.html`, `about.html`, `contact.html`
- `public/styles.css`
- `public/assets/logo-mark.svg` (أيقونة)
- `public/assets/logo-lockup.svg` (لوغو أفقي)
- صور مؤقتة قابلة للاستبدال لاحقًا بصور حقيقية.

## ألوان وهوية مقترحة
- Baby Blue: `#AEE3FF`
- Baby Pink: `#FFD6E8`
- Ink: `#222`
- CTA: `#4C7AF2`

## القادم
- نقل المشروع إلى Next.js 14 + App Router.
- إضافة سلة ودفع (Stripe) وشحن (Shippo/Aramex).
- إضافة i18n (AR/EN) مع RTL تلقائي.
