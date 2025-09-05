"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function CartSummary() {
  const { total, count } = useCart();
  return (
    <div className="card p-4 space-y-3">
      <div className="flex justify-between">
        <span>عدد المنتجات</span>
        <span className="font-semibold">{count}</span>
      </div>
      <div className="flex justify-between">
        <span>الإجمالي</span>
        <span className="font-bold text-cyan-700">{total.toLocaleString('ar-SA')} ر.س</span>
      </div>
      <Link href="/checkout" className="btn btn-primary w-full text-center">إتمام الشراء</Link>
    </div>
  );
}
