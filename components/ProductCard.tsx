
'use client';
import Image from 'next/image';
import { useCart } from '@/components/CartProvider';
import type { Product } from '@/lib/products';
export default function ProductCard({product}:{product:Product}){
  const {add}=useCart();
  return (
    <div className="card overflow-hidden">
      <div className="relative w-full aspect-[4/3] bg-gray-50">
        <Image src={product.image} alt={product.name} fill className="object-cover"/>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-gray-800">{product.name}</h3>
        <p className="text-sm text-gray-600">{product.description}</p>
        <div className="flex items-center justify-between pt-2">
          <span className="font-bold text-cyan-700">{product.price.toLocaleString('ar-SA')} ر.س</span>
          <button className="btn btn-primary" onClick={()=>add(product)}>أضف للسلة</button>
        </div>
      </div>
    </div>
  );
}
