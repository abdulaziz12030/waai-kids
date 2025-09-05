
'use client';
import { useCart } from '@/components/CartProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CheckoutPage(){
  const { items, total, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if(items.length===0){ return <div className="card p-6 text-center"><p>سلتك فارغة. أضف منتجات ثم أعد المحاولة.</p></div>; }

  async function onSubmitEvent(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const orderId = "WK-"+Date.now();
    try{ localStorage.setItem("waai-kids-last-order", JSON.stringify({
      orderId,
      name: String(data.get("name")||""),
      phone: String(data.get("phone")||""),
      city: String(data.get("city")||""),
      address: String(data.get("address")||""),
      pay: String(data.get("pay")||"cod"),
      items, total
    })); }catch{}
    clear();
    router.push(`/success?order=${orderId}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6">
        <h1 className="text-2xl font-bold mb-4">بيانات الدفع والشحن</h1>
        <form onSubmit={onSubmitEvent} className="grid grid-cols-1 gap-4">
          <label className="grid gap-1"><span>الاسم الكامل</span><input name="name" required className="rounded border p-2" placeholder="اكتب اسمك"/></label>
          <label className="grid gap-1"><span>الجوال</span><input name="phone" required className="rounded border p-2" placeholder="05xxxxxxxx"/></label>
          <label className="grid gap-1"><span>المدينة</span><input name="city" required className="rounded border p-2" placeholder="مثال: الرياض"/></label>
          <label className="grid gap-1"><span>العنوان التفصيلي</span><textarea name="address" required className="rounded border p-2" placeholder="الحي، الشارع، رقم المنزل"></textarea></label>
          <fieldset className="grid gap-2"><legend className="font-semibold">طريقة الدفع</legend>
            <label className="flex items-center gap-2"><input type="radio" name="pay" value="cod" defaultChecked/> الدفع عند الاستلام</label>
            <label className="flex items-center gap-2"><input type="radio" name="pay" value="bank"/> تحويل بنكي</label>
          </fieldset>
          <button disabled={loading} className="btn btn-primary">{loading? "جارٍ المعالجة..." : "تأكيد الطلب"}</button>
        </form>
      </div>
      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-bold">ملخص الطلب</h2>
        <ul className="space-y-2">{items.map(i=>(<li key={i.id} className="flex justify-between text-sm"><span>{i.name} × {i.qty}</span><span>{(i.qty*i.price).toLocaleString('ar-SA')} ر.س</span></li>))}</ul>
        <div className="flex justify-between pt-2 border-t"><span>الإجمالي</span><span className="font-bold text-cyan-700">{total.toLocaleString('ar-SA')} ر.س</span></div>
      </div>
    </div>
  );
}
