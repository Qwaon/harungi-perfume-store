'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Дашборд' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/catalog', label: 'Каталог' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/admin/login') return null;

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <nav className="flex items-center gap-4 border-b border-cream-200 px-4 sm:px-6 h-14 bg-cream-50">
      <span className="font-display tracking-[0.2em] text-ink-900">HARUNGI</span>
      <div className="flex gap-3 ml-4">
        {LINKS.map((l) => {
          const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`text-sm transition-colors ${active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'}`}>
              {l.label}
            </Link>
          );
        })}
      </div>
      <button onClick={logout} className="ml-auto text-sm text-ink-500 hover:text-ink-900">Выход</button>
    </nav>
  );
}
