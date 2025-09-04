"use client";
import Link from "next/link";
import { useCart } from "@/providers/CartProvider";
import type { Product } from "@/lib/products";

export default function ProductCard({ p }: { p: Product }) {
  const { addItem } = useCart();
  return (
    <div className="card">
      <img src={p.image} alt={p.title} style={{width:"100%",borderRadius:12}} />
      <h3 style={{margin:"8px 0"}}>{p.title}</h3>
      <div className="price">{p.price} ر.س</div>
      <p style={{fontSize:14,color:"#555"}}>{p.description}</p>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button className="btn" onClick={() => addItem(p)}>أضف للسلة</button>
        <Link className="btn" href={`/product/${p.slug}`}>عرض المنتج</Link>
      </div>
    </div>
  );
}
