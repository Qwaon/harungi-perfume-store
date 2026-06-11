import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';
import SiteChrome from '@/components/SiteChrome';
import MotionProvider from '@/components/MotionProvider';
import TelegramProvider from '@/components/TelegramProvider';
import TelegramShell from '@/components/TelegramShell';
import TelegramBackButton from '@/components/TelegramBackButton';
import { FavoritesProvider } from '@/contexts/FavoritesContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  // Tints mobile browser chrome / status bar to the page background (cream-100).
  themeColor: '#f5f4ed',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://tiamlo.vercel.app'),
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
      <body className="min-h-dvh flex flex-col">
        <MotionProvider>
          <TelegramProvider>
          <CartProvider>
          <FavoritesProvider>
            <TelegramShell />
            <TelegramBackButton />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink-900 focus:text-cream-50 focus:px-4 focus:py-2 focus:rounded-full focus:text-sm"
            >
              Перейти к содержимому
            </a>
            <SiteChrome>{children}</SiteChrome>
          </FavoritesProvider>
          </CartProvider>
          </TelegramProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
