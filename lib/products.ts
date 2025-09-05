
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'newborn' | 'toys' | 'services' | 'tools';
};

export const products: Product[] = [
  { id: 'NB-BOY', name: 'بوكس مواليد (أولاد)', description: 'بطانية + لعبة + بطاقة.', price: 169, image: '/images/p1.svg', category: 'newborn' },
  { id: 'NB-GIRL', name: 'بوكس مواليد (بنات)', description: 'بطانية وردية + لعبة + بطاقة.', price: 169, image: '/images/p1.svg', category: 'newborn' },
  { id: 'TOY-ABC', name: 'بطاقات الحروف', description: 'تعليم الحروف بطريقة ممتعة.', price: 59, image: '/images/p1.svg', category: 'toys' },
  { id: 'SRV-MATH', name: 'جلسة تقوية رياضيات (45د)', description: 'درس أونلاين فردي.', price: 89, image: '/images/p1.svg', category: 'services' },
  { id: 'TOOLS-BAG', name: 'بوكس الحقيبة المدرسية', description: 'حقيبة + مقلمة + دفاتر.', price: 199, image: '/images/p1.svg', category: 'tools' },
];

export const categories = [
  { key: 'newborn', label: 'هدايا المواليد', href: '/categories/newborn-gifts' },
  { key: 'toys', label: 'ألعاب تعليمية', href: '/categories/educational-toys' },
  { key: 'services', label: 'خدمات علمية', href: '/categories/academic-services' },
  { key: 'tools', label: 'أدوات وحقائب', href: '/categories/tools' },
] as const;
