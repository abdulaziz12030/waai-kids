"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("waai-kids-last-order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
  }, []);

  const orderId = params.get("order");

  return (
    <div className="card p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">تم استلام طلبك بنجاح 🎉</h1>
      <p>رقم الطلب: <span className="font-mono font-semibold">{orderId}</span></p>
      {order && (
        <div className="mt-4 text-sm text-gray-700">
          <p>سيتم التواصل عبر الجوال لإتمام {order.pay === 'cod' ? "الدفع عند الاستلام" : "التحويل البنكي"}.</p>
        </div>
      )}
      <div className="mt-6 flex gap-3 justify-center">
        <Link href="/" className="btn btn-primary">متابعة التسوق</Link>
        <button onClick={() => router.push('/cart')} className="btn btn-outline">عرض السلة</button>
      </div>
    </div>
  );
}
