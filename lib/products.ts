export type Product = {
  id: string;
  name: string;
  description: string;
  price: number; // SAR
  image: string;
  category: 'newborn' | 'toys' | 'services' | 'tools';
  tag?: string;
};

export const products: Product[] = [
  // هدايا المواليد
  {
    id: 'NB-BOY-BOX',
    name: 'بوكس هدايا مواليد - أولاد',
    description: 'مجموعة هدايا مميزة للمولود الذكر: بطانية، ببرونة، لعبة ناعمة، بطاقة تهنئة.',
    price: 169,
    image: '/images/boy-box.svg',
    category: 'newborn',
    tag: 'الأكثر مبيعًا'
  },
  {
    id: 'NB-GIRL-BOX',
    name: 'بوكس هدايا مواليد - بنات',
    description: 'بوكس أنيق للمولودة: بطانية وردية، ببرونة، عضاضة، بطاقة تهنئة.',
    price: 169,
    image: '/images/girl-box.svg',
    category: 'newborn',
    tag: 'هدية مثالية'
  },

  // ألعاب تعليمية
  {
    id: 'TOY-ABC',
    name: 'بطاقات الحروف العربية التفاعلية',
    description: 'بطاقات ملونة لتعليم الحروف والنطق والكتابة بأسلوب ممتع.',
    price: 59,
    image: '/images/toy1.svg',
    category: 'toys'
  },
  {
    id: 'TOY-MATH',
    name: 'مكعبات عمليات حسابية',
    description: 'مكعبات لتعليم الجمع والطرح بشكل تفاعلي وممتع للأطفال.',
    price: 79,
    image: '/images/toy1.svg',
    category: 'toys'
  },

  // خدمات علمية للطلاب
  {
    id: 'SRV-SCI-1',
    name: 'مراجعة واجبات العلوم (ابتدائي)',
    description: 'مراجعة وتدقيق واجبات العلوم مع ملاحظات ونصائح للتحسين.',
    price: 39,
    image: '/images/service1.svg',
    category: 'services'
  },
  {
    id: 'SRV-MATH-1',
    name: 'جلسة تقوية في الرياضيات (أونلاين 45 دقيقة)',
    description: 'جلسة فردية عبر الإنترنت لشرح المفاهيم الصعبة والتدرب على المسائل.',
    price: 89,
    image: '/images/service1.svg',
    category: 'services'
  },

  // أدوات وبوكس الحقيبة المدرسية
  {
    id: 'TOOLS-BAG-BOX',
    name: 'بوكس الحقيبة المدرسية',
    description: 'طقم متكامل: حقيبة + مقلمة + دفاتر + أدوات رسم.',
    price: 199,
    image: '/images/tools1.svg',
    category: 'tools',
    tag: 'عرض خاص'
  },
  {
    id: 'TOOLS-STATIONERY',
    name: 'مجموعة أدوات مكتبية ملونة',
    description: 'أقلام، مسطرة، ممحاة، براية، ملصقات تعليمية.',
    price: 49,
    image: '/images/tools1.svg',
    category: 'tools'
  }
];

export const categories = [
  { key: 'newborn', label: 'هدايا المواليد', href: '/categories/newborn-gifts' },
  { key: 'toys', label: 'ألعاب تعليمية', href: '/categories/educational-toys' },
  { key: 'services', label: 'خدمات علمية', href: '/categories/academic-services' },
  { key: 'tools', label: 'أدوات وحقائب', href: '/categories/tools' },
] as const;
