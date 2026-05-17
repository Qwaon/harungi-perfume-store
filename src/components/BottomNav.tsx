'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { count, openCart } = useCart();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const activeClass = 'text-ink-900';
  const inactiveClass = 'text-ink-300';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-cream-50 border-t border-cream-200 flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <Link
        href="/"
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] tracking-wider uppercase transition-colors ${isActive('/') ? activeClass : inactiveClass}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
        Главная
      </Link>

      <Link
        href="/catalog"
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] tracking-wider uppercase transition-colors ${isActive('/catalog') ? activeClass : inactiveClass}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Каталог
      </Link>

      <button
        onClick={openCart}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] tracking-wider uppercase transition-colors relative ${count > 0 ? activeClass : inactiveClass}`}
        aria-label="Корзина"
      >
        <span className="relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-gold-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </span>
        Корзина
      </button>
    </nav>
  );
}
