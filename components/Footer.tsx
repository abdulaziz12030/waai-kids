import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t mt-12">
      <div className="container py-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="text-sm">© {new Date().getFullYear()} واعي كيدز</div>
        <nav className="flex gap-4 text-sm">
          <Link href="/privacy">الخصوصية</Link>
          <Link href="/refund">الاسترجاع</Link>
          <Link href="/terms">الشروط</Link>
        </nav>
      </div>
    </footer>
  );
}
