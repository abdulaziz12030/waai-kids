import { getProductsByCategory } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
export const metadata = { title: "هدايا المواليد | واعي كيدز" };

export default function Gifts() {
  const items = getProductsByCategory("gifts");
  return <div className="grid grid-3">{items.map(p => <ProductCard key={p.id} p={p} />)}</div>;
}
