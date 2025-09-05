"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { categories } from "@/lib/products";

export default function Navbar() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white sticky top-0 z-40 shadow-sm">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.svg" alt="واعي كيدز" width={36} height={36} />
            <span className="text-xl font-bold text-cyan-700">واعي كيدز</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="hover:text-cyan-700">الرئيسية</Link>
          <Link href="/about" className="hover:text-cyan-700">من نحن</Link>
          <div className="relative">
            <button onClick={() => setOpen(!open)} className="hover:text-cyan-700">
              الأقسام ▾
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border shadow-lg p-2">
                {categories.map((c) => (
                  <Link
                    key={c.key}
                    href={c.href}
                    className="block px-3 py-2 rounded hover:bg-gray-50"
                    onClick={() => setOpen(false)}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/cart" className="hover:text-cyan-700">
            السلة <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600 text-white text-xs">{count}</span>
          </Link>
        </nav>

        <div className="md:hidden">
          <Link href="/cart" className="btn btn-primary">السلة ({count})</Link>
        </div>
      </div>
    </header>
  );
}
