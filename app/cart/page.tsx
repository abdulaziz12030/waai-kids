
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import CartSummary from '@/components/CartSummary';
export default function CartPage(){
  const {items,remove,setQty}=useCart();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">سلة المشتريات</h1>
      {items.length===0 ? (
        <div className="card p-6 text-center">
          <p>السلة فارغة.</p>
          <Link href="/" className="btn btn-primary mt-3">العودة للتسوق</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="divide-y">
              {items.map(i=>(
                <div key={i.id} className="flex items-center gap-4 p-4">
                  <div className="relative w-24 h-20"><Image src={i.image} alt={i.name} fill className="object-cover rounded"/></div>
                  <div className="flex-1"><div className="font-semibold">{i.name}</div><div className="text-sm text-gray-600">{i.price.toLocaleString('ar-SA')} ر.س</div></div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={i.qty} onChange={e=>setQty(i.id, Number(e.target.value||1))} className="w-16 rounded border p-1 text-center"/>
                    <button className="text-red-600 hover:underline" onClick={()=>remove(i.id)}>حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <CartSummary/>
        </div>
      )}
    </div>
  );
}
