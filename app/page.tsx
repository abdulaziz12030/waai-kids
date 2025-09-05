import Image from "next/image";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import { products, categories } from "@/lib/products";

export default function Home() {
  const featured = products.slice(0, 6);
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="card overflow-hidden">
        <div className="relative w-full h-[240px] sm:h-[360px]">
          <Image src="/images/hero.svg" alt="واعي كيدز" fill className="object-cover" priority />
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">واعي كيدز — متعة التعلم والهدايا</h1>
          <p className="text-gray-600 max-w-2xl">أربع أقسام رئيسية: هدايا المواليد، ألعاب تعليمية للأطفال، خدمات علمية للطلاب، وأدوات مثل بوكس الحقيبة المدرسية.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {categories.map(c => (
              <Link key={c.key} href={c.href} className="btn btn-outline">{c.label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">منتجات مختارة</h2>
          <Link href="/categories/newborn-gifts" className="text-cyan-700 hover:underline">استعرض الكل</Link>
        </div>
        <ProductGrid items={featured} />
      </section>
    </div>
  );
}
