import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";

export const metadata = {
  title: {
    default: "واعي كيدز | هدايا المواليد والألعاب التعليمية والخدمات العلمية",
    template: "%s | واعي كيدز"
  },
  description: "متجر واعي كيدز: هدايا مواليد، ألعاب تعليمية، خدمات علمية للطلاب، وأدوات مدرسية. تجربة تسوق عربية كاملة مع سلة ودفع.",
  alternates: { canonical: "/" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html dir="rtl" lang="ar">
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Navbar />
          <main className="container flex-1 py-8">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
