
import Link from 'next/link';
export default function SuccessPage({ searchParams }:{ searchParams: { [k:string]: string | string[] | undefined } }){
  const orderId = typeof searchParams.order === 'string' ? searchParams.order : undefined;
  return (
    <div className="card p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">تم استلام طلبك بنجاح 🎉</h1>
      {orderId ? <p>رقم الطلب: <span className="font-mono font-semibold">{orderId}</span></p> : <p>شكراً لتسوقك معنا.</p>}
      <div className="mt-6 flex gap-3 justify-center">
        <Link href="/" className="btn btn-primary">متابعة التسوق</Link>
        <Link href="/cart" className="btn btn-outline">عرض السلة</Link>
      </div>
    </div>
  );
}
