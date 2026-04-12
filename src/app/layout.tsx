import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
    'Оригинальная и нишевая парфюмерия в Ставрополе. Распивы от 2 мл. Baccarat Rouge, Tom Ford, Creed, Dior, Chanel.',
  keywords: 'парфюм, духи, распив, нишевая парфюмерия, Ставрополь, Tom Ford, Chanel, Creed, Dior, оригинал',
  openGraph: {
    title: 'HARUNGI | Нишевая и селективная парфюмерия',
    description: 'Оригинальная и нишевая парфюмерия в Ставрополе. Распивы от 2 мл. Только оригиналы.',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'HARUNGI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HARUNGI | Нишевая и селективная парфюмерия',
    description: 'Нишевая парфюмерия в Ставрополе. Распивы от 2 мл. Только оригиналы.',
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
