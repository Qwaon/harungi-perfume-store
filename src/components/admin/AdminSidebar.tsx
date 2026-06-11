'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon, ShoppingBagIcon, Squares2X2Icon, ArrowRightOnRectangleIcon,
  Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid, ShoppingBagIcon as ShoppingBagIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';

const LINKS = [
  { href: '/admin', label: 'Дашборд', icon: HomeIcon, iconActive: HomeIconSolid },
  { href: '/admin/orders', label: 'Заказы', icon: ShoppingBagIcon, iconActive: ShoppingBagIconSolid },
  { href: '/admin/catalog', label: 'Каталог', icon: Squares2X2Icon, iconActive: Squares2X2IconSolid },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (pathname === '/admin/login') return null;

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  const navItems = (onNavigate?: () => void) => LINKS.map((l) => {
    const active = isActive(l.href);
    const Icon = active ? l.iconActive : l.icon;
    return (
      <Link key={l.href} href={l.href} onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          active ? 'bg-gold-500/10 text-ink-900 border-l-2 border-gold-500' : 'text-ink-500 hover:text-ink-900 hover:bg-cream-100 border-l-2 border-transparent'
        }`}>
        <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-gold-500' : ''}`} />
        {l.label}
      </Link>
    );
  });

  return (
    <>
      {/* Десктоп: постоянный левый сайдбар */}
      <aside className="hidden md:flex md:flex-col w-56 shrink-0 border-r border-cream-200 bg-cream-50 px-3 py-5">
        <span className="font-display tracking-[0.2em] text-ink-900 px-3 mb-6 block">HARUNGI</span>
        <nav className="flex flex-col gap-1">{navItems()}</nav>
        <button onClick={logout}
          className="mt-auto flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-500 hover:text-ink-900 hover:bg-cream-100 transition-colors">
          <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
          Выход
        </button>
      </aside>

      {/* Мобильный: верхний бар + раскрывающееся меню */}
      <div className="md:hidden border-b border-cream-200 bg-cream-50">
        <div className="flex items-center gap-4 px-4 h-14">
          <span className="font-display tracking-[0.2em] text-ink-900">HARUNGI</span>
          <button onClick={() => setMobileOpen((v) => !v)} aria-label="Меню" className="ml-auto text-ink-700">
            {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="flex flex-col gap-1 px-3 pb-3">
            {navItems(() => setMobileOpen(false))}
            <button onClick={logout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-500 hover:text-ink-900 hover:bg-cream-100 transition-colors">
              <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
              Выход
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
