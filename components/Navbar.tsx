
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/CartProvider';
import { categories } from '@/lib/products';

export default function Navbar(){
  const {count}=useCart();
  return (
    <header className="bg-white sticky top-0 z-40 shadow-sm">
      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo.svg" alt="واعي كيدز" width={36} height={36}/>
          <span className="text-xl font-bold text-cyan-700">واعي كيدز</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/">الرئيسية</Link>
          <Link href="/about">من نحن</Link>
          {categories.map(c=>(<Link key={c.key} href={c.href}>{c.label}</Link>))}
          <Link href="/cart">السلة ({count})</Link>
        </nav>
        <Link className="md:hidden btn btn-primary" href="/cart">السلة ({count})</Link>
      </div>
    </header>
  );
}
