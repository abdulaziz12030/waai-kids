import ProductGrid from "@/components/ProductGrid";
import { products } from "@/lib/products";

export const metadata = { title: "أدوات وحقائب" };

export default function Page() {
  const items = products.filter(p => p.category === 'tools');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">أدوات وحقائب مدرسية</h1>
      <ProductGrid items={items} />
    </div>
  );
}
