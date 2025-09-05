import ProductCard from '@/components/ProductCard';
import type { Product } from '@/lib/products';
export default function ProductGrid({items}:{items:Product[]}){return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{items.map(p=><ProductCard key={p.id} product={p}/>)}</div>;}
