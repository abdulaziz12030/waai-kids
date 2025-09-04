"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import cn from "classnames";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/gifts", label: "هدايا المواليد" },
  { href: "/toys", label: "ألعاب تعليمية" },
  { href: "/services", label: "خدمات الطالب" },
  { href: "/cart", label: "السلة" }
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="font-bold text-lg">
          واعي كيدز · Waai Kids
        </Link>
        <nav className="flex gap-3">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("px-3 py-1 rounded-xl text-sm hover:bg-gray-100", {
                "bg-gray-100": pathname === l.href
              })}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
