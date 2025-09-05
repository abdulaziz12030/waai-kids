import ProductGrid from "@/components/ProductGrid";
import { products } from "@/lib/products";

export const metadata = { title: "هدايا المواليد" };

export default function Page() {
  const items = products.filter(p => p.category === 'newborn');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">هدايا المواليد</h1>
      <ProductGrid items={items} />
    </div>
  );
}
