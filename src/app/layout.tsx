import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/contexts/CartContext';
import CartDrawer from '@/components/CartDrawer';
import BottomNav from '@/components/BottomNav';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://qwaon.github.io/harungi-perfume-store'),
  title: {
    default: 'HARUNGI | Нишевая и селективная парфюмерия',
    template: '%s | HARUNGI',
  },
  description:
    'Оригинальная и нишевая парфюмерия в Ставрополе. Распивы от 5 мл. Baccarat Rouge, Tom Ford, Creed, Dior, Chanel.',
  keywords: 'парфюм, духи, распив, нишевая парфюмерия, Ставрополь, Tom Ford, Chanel, Creed, Dior, оригинал',
  openGraph: {
    title: 'HARUNGI | Нишевая и селективная парфюмерия',
    description: 'Оригинальная и нишевая парфюмерия в Ставрополе. Распивы от 5 мл. Только оригиналы.',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'HARUNGI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HARUNGI | Нишевая и селективная парфюмерия',
    description: 'Нишевая парфюмерия в Ставрополе. Распивы от 5 мл. Только оригиналы.',
  },
  referrer: 'strict-origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Header />
          <CartDrawer />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
