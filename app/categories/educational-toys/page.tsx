import ProductGrid from "@/components/ProductGrid";
import { products } from "@/lib/products";

export const metadata = { title: "ألعاب تعليمية" };

export default function Page() {
  const items = products.filter(p => p.category === 'toys');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ألعاب تعليمية للأطفال</h1>
      <ProductGrid items={items} />
    </div>
  );
}
