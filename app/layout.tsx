
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';

export const metadata = {
  title: { default: "واعي كيدز", template: "%s | واعي كيدز" },
  description: "متجر واعي كيدز — هدايا المواليد، ألعاب تعليمية، خدمات علمية، وأدوات مدرسية.",
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Navbar/>
          <main className="container flex-1 py-8">{children}</main>
          <Footer/>
        </CartProvider>
      </body>
    </html>
  );
}
