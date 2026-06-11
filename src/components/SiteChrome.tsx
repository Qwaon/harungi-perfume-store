'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';

/**
 * Обёртка над сайтовым «хромом» (Header/Footer/CartDrawer/BottomNav).
 * На /admin/* всё это скрывается — у админки свой layout и навигация,
 * иначе сайтовый Header/Footer накладываются поверх админских.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <main id="main-content" className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <CartDrawer />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
