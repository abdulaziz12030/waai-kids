import { getProductsByCategory } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
export const metadata = { title: "ألعاب تعليمية | واعي كيدز" };

export default function Toys() {
  const items = getProductsByCategory("toys");
  return <div className="grid grid-3">{items.map(p => <ProductCard key={p.id} p={p} />)}</div>;
}
