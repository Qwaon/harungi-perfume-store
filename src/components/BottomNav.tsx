'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useTelegram } from '@/contexts/TelegramContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { count, openCart } = useCart();
  const { isTelegram } = useTelegram();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const activeClass = 'text-ink-900';
  const inactiveClass = 'text-ink-300';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-cream-100 border-t border-cream-200 flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <Link
        href="/"
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] tracking-wider uppercase transition-colors ${isActive('/') ? activeClass : inactiveClass}`}
      >
        <svg width="20" height="18" viewBox="0 0 15 13" fill="currentColor">
          <path d="M0.603516 6.46875C0.228516 6.46875 0 6.21094 0 5.90625C0 5.74219 0.0761719 5.57227 0.228516 5.44336L6.33398 0.316406C6.5918 0.105469 6.87305 0 7.1543 0C7.43555 0 7.7168 0.105469 7.97461 0.316406L10.8691 2.75391V1.71094C10.8691 1.45312 11.0449 1.2832 11.3086 1.2832H12.0996C12.3574 1.2832 12.5273 1.45312 12.5273 1.71094V4.14258L14.0801 5.44336C14.2324 5.57227 14.3086 5.74219 14.3086 5.90625C14.3086 6.21094 14.0801 6.46875 13.7109 6.46875C13.5293 6.46875 13.3652 6.375 13.2246 6.25195L7.40625 1.37109C7.32422 1.30078 7.23633 1.27148 7.1543 1.27148C7.07227 1.27148 6.98438 1.30078 6.9082 1.37109L1.08398 6.25195C0.943359 6.375 0.785156 6.46875 0.603516 6.46875ZM1.89844 11.2031V6.7207L6.79102 2.61914C7.01367 2.43164 7.28906 2.42578 7.51172 2.61914L12.4102 6.7207V11.2031C12.4102 12.0469 11.8828 12.5508 11.0156 12.5508H3.28711C2.42578 12.5508 1.89844 12.0469 1.89844 11.2031ZM5.56641 11.4258H8.74219V8.04492C8.74219 7.76953 8.56641 7.59375 8.29102 7.59375H6.02344C5.74805 7.59375 5.56641 7.76953 5.56641 8.04492V11.4258Z" />
        </svg>
        Главная
      </Link>

      <Link
        href="/catalog"
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] tracking-wider uppercase transition-colors ${isActive('/catalog') ? activeClass : inactiveClass}`}
      >
        <svg width="20" height="18" viewBox="0 0 12 11" fill="currentColor">
          <path d="M1.01953 3.95508C0.375 3.95508 0 3.58594 0 2.96484V0.996094C0 0.375 0.375 0 1.01953 0H2.93555C3.58008 0 3.95508 0.375 3.95508 0.996094V2.96484C3.95508 3.58594 3.58008 3.95508 2.93555 3.95508H1.01953ZM5.68359 0.943359C5.41406 0.943359 5.20898 0.738281 5.20898 0.474609C5.20898 0.210938 5.41406 0 5.68359 0H11.3262C11.5898 0 11.8066 0.210938 11.8066 0.474609C11.8066 0.738281 11.5898 0.943359 11.3262 0.943359H5.68359ZM5.68359 4.01367C5.41406 4.01367 5.20898 3.80273 5.20898 3.53906C5.20898 3.27539 5.41406 3.07031 5.68359 3.07031H11.3262C11.5898 3.07031 11.8066 3.27539 11.8066 3.53906C11.8066 3.80273 11.5898 4.01367 11.3262 4.01367H5.68359ZM5.68359 7.07812C5.41406 7.07812 5.20898 6.87305 5.20898 6.60938C5.20898 6.33984 5.41406 6.13477 5.68359 6.13477H11.3262C11.5898 6.13477 11.8066 6.33984 11.8066 6.60938C11.8066 6.87305 11.5898 7.07812 11.3262 7.07812H5.68359ZM1.01953 10.1426C0.375 10.1426 0 9.77344 0 9.15234V7.18359C0 6.5625 0.375 6.1875 1.01953 6.1875H2.93555C3.58008 6.1875 3.95508 6.5625 3.95508 7.18359V9.15234C3.95508 9.77344 3.58008 10.1426 2.93555 10.1426H1.01953ZM5.68359 10.1426C5.41406 10.1426 5.20898 9.9375 5.20898 9.67383C5.20898 9.41016 5.41406 9.19922 5.68359 9.19922H11.3262C11.5898 9.19922 11.8066 9.41016 11.8066 9.67383C11.8066 9.9375 11.5898 10.1426 11.3262 10.1426H5.68359Z" />
        </svg>
        Каталог
      </Link>

      <button
        onClick={openCart}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] tracking-wider uppercase transition-colors relative ${count > 0 ? activeClass : inactiveClass}`}
        aria-label="Корзина"
      >
        <span className="relative">
          <svg width="20" height="18" viewBox="0 0 14 12" fill="currentColor">
            <path d="M0 0.550781C0 0.251953 0.251953 0 0.539062 0H2.55469C3.20508 0 3.4043 0.257812 3.47461 0.761719L3.56836 1.40625H12.9727C13.3711 1.40625 13.6113 1.63477 13.6113 1.97461C13.6113 2.0332 13.5996 2.13281 13.5879 2.21484L13.1484 5.16211C13.0137 6.04688 12.5449 6.5918 11.6543 6.5918H4.31836L4.41211 7.20117C4.45312 7.5 4.62891 7.70508 4.91602 7.70508H11.6074C11.8828 7.70508 12.123 7.91602 12.123 8.2207C12.123 8.52539 11.8828 8.73633 11.6074 8.73633H4.78711C3.89648 8.73633 3.42773 8.19727 3.29883 7.31836L2.38477 1.0957H0.539062C0.251953 1.0957 0 0.84375 0 0.550781ZM4.24805 10.6523C4.24805 10.084 4.69922 9.63281 5.26172 9.63281C5.83008 9.63281 6.27539 10.084 6.27539 10.6523C6.27539 11.2148 5.83008 11.666 5.26172 11.666C4.69922 11.666 4.24805 11.2148 4.24805 10.6523ZM9.66211 10.6523C9.66211 10.084 10.1191 9.63281 10.6816 9.63281C11.25 9.63281 11.7012 10.084 11.7012 10.6523C11.7012 11.2148 11.25 11.666 10.6816 11.666C10.1191 11.666 9.66211 11.2148 9.66211 10.6523Z" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-gold-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </span>
        Корзина
      </button>

      {isTelegram && (
        <Link
          href="/account"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] tracking-wider uppercase transition-colors ${isActive('/account') ? activeClass : inactiveClass}`}
        >
          <svg width="20" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.7 0-5 1.4-5 3.4V14h10v-1.1c0-2-2.3-3.4-5-3.4Z" />
          </svg>
          Аккаунт
        </Link>
      )}
    </nav>
  );
}
