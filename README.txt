واعي كيدز — نسخة متكاملة
========================

الملفات:
- index.html (الرئيسية + التقييمات)
- product.html (صفحة المنتج: اختيار النوع والكمية)
- gift.html (بطاقة الإهداء — اختيارية)
- checkout.html (إتمام الطلب: ملخص + بيانات عميل + واتساب)

- /images  ← ضع صورك هنا بنفس الأسماء: banner.png, girl.png, boy.png, logo.png
- /js/cart.js  ← منطق السلة + أزرار واتساب + موشن ظهور
- /api/reviews.js  ← API للتقييمات (Vercel Serverless + Supabase)
- admin.html ← لوحة إدارة التقييمات

الإعداد:
1) Supabase:
   - أنشئ مشروع جديد.
   - SQL:
     create table if not exists reviews (
       id bigserial primary key,
       created_at timestamptz default now(),
       name text,
       stars int check (stars between 1 and 5) not null,
       text text not null,
       approved boolean default true
     );
     alter table reviews enable row level security;

2) Vercel → Project Settings → Environment Variables:
   - SUPABASE_URL = https://YOUR-PROJECT.supabase.co
   - SUPABASE_SERVICE_ROLE = (Service Role Key من Supabase)
   - ADMIN_KEY = 123123

3) ارفع المشروع على GitHub المرتبط بـ Vercel. سيُنشر تلقائيًا.
4) لعرض التقييمات: GET /api/reviews
5) لإضافة تقييم: POST /api/reviews  (name, stars, text)
6) لوحة الأدمن: admin.html → أدخل ADMIN_KEY (افتراضيًا 123123) ثم إدارة (اعتماد/إخفاء/حذف).

ملاحظات:
- استبدل صور /images بصورك الفعلية بنفس الأسماء.
- ألوان وهوية واعي كيدز محفوظة. الخط كبير ومريح للجوال والآيباد واللابتوب.
- الدفع الإلكتروني نضيفه لاحقًا بسهولة عبر صفحة checkout.html.
