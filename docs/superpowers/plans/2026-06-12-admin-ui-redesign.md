# Admin UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace emoji and flat hairline-border cards in `/admin` with `@heroicons/react` icons, color-coded status badges, a sidebar navigation, and richer empty/alert states — keeping the existing cream/ink/gold palette and card-based catalog layout.

**Architecture:** Pure UI/styling changes to existing client/server components. No API, type, or business-logic changes. `@heroicons/react` is added as a new dependency and imported directly per-component (tree-shakeable, no central icon registry needed for this scope).

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, `@heroicons/react` v2 (new).

---

## Task 1: Install `@heroicons/react`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the package**

```bash
npm install @heroicons/react
```

- [ ] **Step 2: Verify it's importable**

```bash
node -e "require.resolve('@heroicons/react/24/outline/HomeIcon.js')" && echo OK
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: добавить @heroicons/react для иконок админки"
```

---

## Task 2: Sidebar navigation (`AdminNav` → `AdminSidebar`)

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/app/admin/layout.tsx`
- Delete: `src/components/admin/AdminNav.tsx` (replaced)

Current `src/components/admin/AdminNav.tsx`:
```tsx
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
```

Current `src/app/admin/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';

export const metadata: Metadata = { title: 'Админка HARUNGI', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream-100">
      <AdminNav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 1: Create `src/components/admin/AdminSidebar.tsx`**

```tsx
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
```

- [ ] **Step 2: Update `src/app/admin/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata: Metadata = { title: 'Админка HARUNGI', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream-100 md:flex">
      <AdminSidebar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Delete the old nav file**

```bash
rm src/components/admin/AdminNav.tsx
```

- [ ] **Step 4: Verify no other imports reference `AdminNav`**

```bash
grep -r "AdminNav" src/ || echo "no references"
```
Expected: `no references`

- [ ] **Step 5: Build to verify no TS/import errors**

```bash
npm run build
```
Expected: build succeeds (exit 0).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): сайдбар-навигация с иконками вместо верхнего меню"
```

---

## Task 3: Dashboard icons and alert/top-sales styling

**Files:**
- Modify: `src/app/admin/page.tsx`

Current full file (`src/app/admin/page.tsx`) is 142 lines, shown in the spec context — key sections to change:

- [ ] **Step 1: Add heroicons imports at the top of `src/app/admin/page.tsx`** (after the existing `import` line)

```tsx
import Link from 'next/link';
import { countOrdersByStatus, selectPerfumes, selectAllOrderItems } from '@/lib/admin/supabase-server';
import {
  ClipboardDocumentListIcon, SparklesIcon, CheckCircleIcon, TruckIcon,
  CheckBadgeIcon, XCircleIcon, Squares2X2Icon, PhotoIcon, BanknotesIcon,
  NoSymbolIcon, TrophyIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
```

- [ ] **Step 2: Add an icon map next to `STATUS_ICONS`** — replace the `STATUS_ICONS` constant (lines 10-12) with:

```tsx
const STATUS_ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  total: ClipboardDocumentListIcon,
  new: SparklesIcon,
  accepted: CheckCircleIcon,
  shipped: TruckIcon,
  done: CheckBadgeIcon,
  canceled: XCircleIcon,
};
```

(Remove the old `STATUS_ICONS` emoji map entirely — it's no longer used.)

- [ ] **Step 3: Replace stat cards JSX** — replace the block from `<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">` through its closing `</div>` (original lines 64-79) with:

```tsx
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4 flex flex-col gap-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <span className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
            <ClipboardDocumentListIcon className="w-5 h-5 text-gold-500" />
          </span>
          <div>
            <p className="label text-ink-300">Всего заказов</p>
            <p className="font-display text-3xl font-light text-gold-500">{counts.total ?? 0}</p>
          </div>
        </div>
        {['new', 'accepted', 'shipped', 'done', 'canceled'].map((s) => {
          const Icon = STATUS_ICON_COMPONENTS[s];
          return (
            <div key={s} className="rounded-xl bg-cream-50 p-4 flex flex-col gap-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
              <span className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-gold-500" />
              </span>
              <div>
                <p className="label text-ink-300">{STATUS_LABELS[s]}</p>
                <p className="font-display text-3xl font-light text-ink-900">{counts[s] ?? 0}</p>
              </div>
            </div>
          );
        })}
        <div className="rounded-xl bg-cream-50 p-4 flex flex-col gap-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <span className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
            <Squares2X2Icon className="w-5 h-5 text-gold-500" />
          </span>
          <div>
            <p className="label text-ink-300">Товаров</p>
            <p className="font-display text-3xl font-light text-ink-900">{perfumes.length}</p>
          </div>
        </div>
      </div>
```

- [ ] **Step 4: Replace "Требует внимания" block** — replace the block starting at `<h2 className="font-display text-lg font-light text-ink-900 mb-3">Требует внимания</h2>` through its closing `</div>` (original lines 81-104) with:

```tsx
      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Требует внимания</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {noPhoto.length > 0 && (
          <Link href="/admin/catalog?alert=no-photo" className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <PhotoIcon className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <p className="label text-ink-300">Без фото</p>
              <p className="font-display text-2xl font-light text-ink-900">{noPhoto.length}</p>
            </div>
          </Link>
        )}
        {noPrice.length > 0 && (
          <Link href="/admin/catalog?alert=no-price" className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <BanknotesIcon className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <p className="label text-ink-300">Без цен</p>
              <p className="font-display text-2xl font-light text-ink-900">{noPrice.length}</p>
            </div>
          </Link>
        )}
        {outOfStock.length > 0 && (
          <Link href="/admin/catalog?alert=out-of-stock" className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <NoSymbolIcon className="w-5 h-5 text-red-600" />
            </span>
            <div>
              <p className="label text-ink-300">Нет в наличии</p>
              <p className="font-display text-2xl font-light text-ink-900">{outOfStock.length}</p>
            </div>
          </Link>
        )}
        {noPhoto.length === 0 && noPrice.length === 0 && outOfStock.length === 0 && (
          <div className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 col-span-full" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </span>
            <p className="text-sm text-ink-500">Проблем не найдено</p>
          </div>
        )}
      </div>
```

- [ ] **Step 5: Replace "Топ продаж" block** — replace the block starting at `<h2 className="font-display text-lg font-light text-ink-900 mb-3">Топ продаж</h2>` through its closing `</div>` (original lines 106-134) with:

```tsx
      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Топ продаж</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2 flex items-center gap-1.5">
            <TrophyIcon className="w-4 h-4 text-gold-500" />
            Топ товаров
          </p>
          {topProducts.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topProducts.map((t, i) => (
                <li key={t.label} className="flex items-center gap-2">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    i === 0 ? 'bg-gold-500 text-cream-50' : i < 3 ? 'bg-gold-400/40 text-ink-900' : 'text-ink-300'
                  }`}>{i + 1}</span>
                  <span className="truncate flex-1">{t.label}</span>
                  <span className="text-ink-300 shrink-0">{t.qty} шт</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2 flex items-center gap-1.5">
            <ChartBarIcon className="w-4 h-4 text-gold-500" />
            Топ брендов
          </p>
          {topBrands.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topBrands.map((t, i) => (
                <li key={t.label} className="flex items-center gap-2">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    i === 0 ? 'bg-gold-500 text-cream-50' : i < 3 ? 'bg-gold-400/40 text-ink-900' : 'text-ink-300'
                  }`}>{i + 1}</span>
                  <span className="truncate flex-1">{t.label}</span>
                  <span className="text-ink-300 shrink-0">{t.qty} шт</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
```

- [ ] **Step 6: Build to verify**

```bash
npm run build
```
Expected: build succeeds (exit 0). Watch for `React.ComponentType` requiring `import type { ComponentType } from 'react'` — if TS complains about `React` namespace, change the type annotation in Step 2 to use `ComponentType` directly with `import type { ComponentType } from 'react';` added to imports.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): иконки heroicons на дашборде вместо эмодзи"
```

---

## Task 4: Catalog icons, status pills, sticky bulk bar

**Files:**
- Modify: `src/components/admin/CatalogListClient.tsx`

- [ ] **Step 1: Add heroicons imports** to the top of `src/components/admin/CatalogListClient.tsx` (after existing imports):

```tsx
import {
  MagnifyingGlassIcon, FunnelIcon, PhotoIcon, PencilSquareIcon, TrashIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
```

- [ ] **Step 2: Wrap the search input with an icon** — replace:

```tsx
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по бренду/названию" className="input-base mb-3" />
```

with:

```tsx
      <div className="relative mb-3">
        <MagnifyingGlassIcon className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по бренду/названию" className="input-base pl-9" />
      </div>
```

- [ ] **Step 3: Add a "Фильтры" label with icon before the filter row** — replace:

```tsx
      <div className="flex flex-wrap gap-2 mb-3">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-base w-auto text-sm">
```

with:

```tsx
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-ink-300 label">
          <FunnelIcon className="w-4 h-4" />
          Фильтры
        </span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-base w-auto text-sm">
```

- [ ] **Step 4: Add status pill helper** — add this function near `hasNoPrice` (after its definition, before `export default function CatalogListClient`):

```tsx
function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-700">в наличии</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-700">нет в наличии</span>
  );
}
```

- [ ] **Step 5: Replace the photo placeholder, item text, and action buttons** — replace:

```tsx
                  {p.images
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.images.split(',')[0].trim()} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-cream-200 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-900 truncate">{p.brand} — {p.name}</p>
                    <p className="text-xs text-ink-300">{p.inStock ? 'в наличии' : 'нет в наличии'}{priceSummary(p) ? ` · ${priceSummary(p)}` : ''}</p>
                  </div>
                  <button onClick={() => router.push(`/admin/catalog/${p.id}`)} className="text-xs text-ink-500 hover:text-ink-900 shrink-0">Править</button>
                  <button onClick={() => remove(p.id)} className="text-xs text-ink-500 hover:text-ink-900 shrink-0">Удалить</button>
```

with:

```tsx
                  {p.images
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.images.split(',')[0].trim()} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-cream-200 shrink-0 flex items-center justify-center">
                        <PhotoIcon className="w-6 h-6 text-ink-300" />
                      </div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-900 truncate">{p.brand} — {p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StockBadge inStock={p.inStock} />
                      {priceSummary(p) && <p className="text-xs text-ink-300">{priceSummary(p)}</p>}
                    </div>
                  </div>
                  <button onClick={() => router.push(`/admin/catalog/${p.id}`)} aria-label="Править" className="text-ink-500 hover:text-ink-900 shrink-0 p-1">
                    <PencilSquareIcon className="w-[18px] h-[18px]" />
                  </button>
                  <button onClick={() => remove(p.id)} aria-label="Удалить" className="text-ink-500 hover:text-red-600 shrink-0 p-1">
                    <TrashIcon className="w-[18px] h-[18px]" />
                  </button>
```

- [ ] **Step 6: Add a border to brand group headers** — replace:

```tsx
                  <div className="sticky top-14 bg-cream-100 px-1 py-1 label text-ink-300 z-10">{p.brand}</div>
```

with:

```tsx
                  <div className="sticky top-14 bg-cream-100 px-1 py-1.5 label text-ink-300 z-10 border-b border-cream-200">{p.brand}</div>
```

- [ ] **Step 7: Make the selection bar sticky with icon** — replace:

```tsx
      <div className="flex items-center gap-3 mb-3 text-sm">
        <button type="button" onClick={selectAllVisible} className="text-ink-500 hover:text-ink-900 underline">Выбрать все ({filtered.length})</button>
        <button type="button" onClick={clearSelection} className="text-ink-500 hover:text-ink-900 underline">Снять всё</button>
        {selected.size > 0 && (
          <>
            <span className="text-ink-300">Выбрано: {selected.size}</span>
            <button type="button" onClick={() => setShowBulk(true)} className="btn-primary text-xs px-3 py-1.5">
              Изменить цены ({selected.size})
            </button>
          </>
        )}
      </div>
```

with:

```tsx
      <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
        <button type="button" onClick={selectAllVisible} className="text-ink-500 hover:text-ink-900 underline">Выбрать все ({filtered.length})</button>
        <button type="button" onClick={clearSelection} className="text-ink-500 hover:text-ink-900 underline">Снять всё</button>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:static md:z-auto bg-ink-900 text-cream-50 md:bg-cream-200 md:text-ink-900 md:rounded-xl px-4 py-3 md:py-2 mb-3 flex items-center gap-3">
          <span className="text-sm">Выбрано: {selected.size}</span>
          <button type="button" onClick={() => setShowBulk(true)} className="btn-primary text-xs px-3 py-1.5 ml-auto md:ml-0 flex items-center gap-1.5">
            <CurrencyDollarIcon className="w-4 h-4" />
            Изменить цены ({selected.size})
          </button>
        </div>
      )}
```

- [ ] **Step 8: Build to verify**

```bash
npm run build
```
Expected: build succeeds (exit 0).

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/CatalogListClient.tsx
git commit -m "feat(admin): иконки и статус-бейджи в каталоге, sticky-бар массового выбора"
```

---

## Task 5: Orders status badges, icons, and contact icon

**Files:**
- Modify: `src/components/admin/OrdersClient.tsx`

- [ ] **Step 1: Add heroicons imports** to the top of `src/components/admin/OrdersClient.tsx` (after existing imports):

```tsx
import {
  SparklesIcon, CheckCircleIcon, TruckIcon, CheckBadgeIcon, XCircleIcon,
  Squares2X2Icon, ChevronDownIcon, ChatBubbleLeftRightIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
```

- [ ] **Step 2: Add icon map and badge color map** — add after the `TAB_LABEL` constant:

```tsx
const STATUS_TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '': Squares2X2Icon, new: SparklesIcon, accepted: CheckCircleIcon,
  shipped: TruckIcon, done: CheckBadgeIcon, canceled: XCircleIcon,
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  new: 'bg-ink-900/5 text-ink-700',
  accepted: 'bg-green-500/10 text-green-700',
  shipped: 'bg-blue-500/10 text-blue-700',
  done: 'bg-green-500/10 text-green-700',
  canceled: 'bg-red-500/10 text-red-700',
};
```

If `React.ComponentType` causes a TS namespace error in build (Step 8), add `import type { ComponentType } from 'react';` to imports and change the type to `Record<string, ComponentType<{ className?: string }>>`.

- [ ] **Step 3: Update status tabs with icons** — replace:

```tsx
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${status === s ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
            {TAB_LABEL[s]}
          </button>
        ))}
      </div>
```

with:

```tsx
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_TABS.map((s) => {
          const Icon = STATUS_TAB_ICONS[s];
          return (
            <button key={s} onClick={() => setStatus(s)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${status === s ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
              <Icon className="w-3.5 h-3.5" />
              {TAB_LABEL[s]}
            </button>
          );
        })}
      </div>
```

- [ ] **Step 4: Add status badge and chevron to the order summary row** — replace:

```tsx
                <button onClick={() => setOpenId(open ? null : o.id)}
                  className="w-full flex justify-between items-center px-4 py-3 text-left">
                  <div>
                    <p className="text-sm text-ink-900">№{o.order_number} · {o.customer_name}</p>
                    <p className="text-xs text-ink-300">
                      {new Date(o.created_at).toLocaleDateString('ru-RU')} · {o.contact} · {STATUS_LABELS[o.status] ?? o.status}
                    </p>
                  </div>
                  <p className="font-display text-lg font-light text-ink-900 tabular-nums">{o.total.toLocaleString('ru-RU')} ₽</p>
                </button>
```

with:

```tsx
                <button onClick={() => setOpenId(open ? null : o.id)}
                  className="w-full flex justify-between items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-900">№{o.order_number} · {o.customer_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-ink-300">
                        {new Date(o.created_at).toLocaleDateString('ru-RU')} · {o.contact}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE_CLASSES[o.status] ?? 'bg-ink-900/5 text-ink-700'}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="font-display text-lg font-light text-ink-900 tabular-nums">{o.total.toLocaleString('ru-RU')} ₽</p>
                    <ChevronDownIcon className={`w-4 h-4 text-ink-300 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>
```

- [ ] **Step 5: Add contact icon** — replace:

```tsx
                    <div className="text-sm text-ink-700">
                      <span className="text-ink-300">Контакт: </span>
                      {contactHref(o.contact)
                        ? <a href={contactHref(o.contact) as string} target="_blank" rel="noopener noreferrer"
                            className="text-gold-500 underline hover:text-ink-900">{o.contact}</a>
                        : <span>{o.contact}</span>}
                    </div>
```

with:

```tsx
                    <div className="text-sm text-ink-700 flex items-center gap-1.5">
                      <span className="text-ink-300">Контакт:</span>
                      {(() => {
                        const href = contactHref(o.contact);
                        if (!href) return <span>{o.contact}</span>;
                        const Icon = href.startsWith('tel:') ? PhoneIcon : ChatBubbleLeftRightIcon;
                        return (
                          <a href={href} target="_blank" rel="noopener noreferrer"
                            className="text-gold-500 underline hover:text-ink-900 inline-flex items-center gap-1">
                            <Icon className="w-4 h-4" />
                            {o.contact}
                          </a>
                        );
                      })()}
                    </div>
```

- [ ] **Step 6: Update status-change buttons with badge colors** — replace:

```tsx
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_TABS.filter(Boolean).map((s) => (
                        <button key={s} onClick={() => changeStatus(o.id, s)}
                          className={`text-xs px-2.5 py-1 rounded-full border ${o.status === s ? 'bg-gold-500 text-white border-gold-500' : 'border-cream-200 text-ink-500'}`}>
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
```

with:

```tsx
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_TABS.filter(Boolean).map((s) => {
                        const Icon = STATUS_TAB_ICONS[s];
                        const active = o.status === s;
                        return (
                          <button key={s} onClick={() => changeStatus(o.id, s)}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                              active ? `${STATUS_BADGE_CLASSES[s]} border-transparent font-medium` : 'border-cream-200 text-ink-500'
                            }`}>
                            <Icon className="w-3.5 h-3.5" />
                            {STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
```

- [ ] **Step 7: Build to verify**

```bash
npm run build
```
Expected: build succeeds (exit 0).

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/OrdersClient.tsx
git commit -m "feat(admin): статус-бейджи и иконки в заказах"
```

---

## Task 6: Login page polish

**Files:**
- Modify: `src/app/admin/login/page.tsx`

- [ ] **Step 1: Add heroicons imports** to the top of `src/app/admin/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
```

- [ ] **Step 2: Add `showPassword` state** — replace:

```tsx
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
```

with:

```tsx
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
```

- [ ] **Step 3: Update form card and input** — replace:

```tsx
      <form onSubmit={submit} className="w-full max-w-sm bg-cream-50 rounded-2xl p-6"
        style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
        <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Вход в админку</h1>
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль" className="input-base mb-4" />
        {error && <p role="alert" className="text-sm text-ink-500 mb-4">{error}</p>}
```

with:

```tsx
      <form onSubmit={submit} className="w-full max-w-sm bg-cream-50 rounded-2xl p-6 border border-cream-200 shadow-lg shadow-ink-900/5">
        <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Вход в админку</h1>
        <div className="relative mb-4">
          <LockClosedIcon className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type={showPassword ? 'text' : 'password'} autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль" className="input-base pl-9 pr-9" />
          <button type="button" onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-900">
            {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-ink-500 mb-4">{error}</p>}
```

- [ ] **Step 4: Build to verify**

```bash
npm run build
```
Expected: build succeeds (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "feat(admin): иконки в форме входа (замок, показать пароль)"
```

---

## Task 7: BulkPriceModal icon polish

**Files:**
- Modify: `src/components/admin/BulkPriceModal.tsx`

- [ ] **Step 1: Add heroicons import** to the top of `src/components/admin/BulkPriceModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { applyPriceDelta, BULK_PRICE_FIELDS, type BulkPriceField, type BulkPriceMode } from '@/lib/admin/catalog-logic';
```

- [ ] **Step 2: Add icon to the modal title** — replace:

```tsx
        <h2 className="font-display text-xl font-light text-ink-900">
          Изменить цены ({items.length})
        </h2>
```

with:

```tsx
        <h2 className="font-display text-xl font-light text-ink-900 flex items-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-gold-500" />
          Изменить цены ({items.length})
        </h2>
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```
Expected: build succeeds (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/BulkPriceModal.tsx
git commit -m "feat(admin): иконка в заголовке модалки массового изменения цен"
```

---

## Task 8: Live verification with Playwright

**Files:** none (verification only)

- [ ] **Step 1: Build production bundle and start server**

```bash
npm run build && npm run start -- -p 3987
```

- [ ] **Step 2: Use Playwright MCP to verify**

Navigate to `http://localhost:3987/admin/login`, log in with `ADMIN_PASSWORD` from `.env.local`. Then check:
- `/admin` — stat cards show heroicons (not emoji), alert cards show colored icon badges, top products/brands show ranked badges.
- `/admin/catalog` — search has icon, filters row has "Фильтры" label with funnel icon, items without photos show photo icon placeholder, stock badges are colored pills, edit/delete are icon buttons. Select a few items and verify the bulk bar appears (sticky on mobile viewport, inline on desktop).
- `/admin/orders` — status tabs have icons, order cards show colored status badges and a chevron that rotates on expand, contact link shows telegram/phone icon.
- `/admin/login` — verify lock icon and show/hide password toggle work.
- Resize viewport to mobile width (e.g. 390px) and verify the sidebar collapses to a top bar with hamburger menu that expands/collapses correctly.

- [ ] **Step 3: Clean up**

```bash
# Kill the server (Ctrl+C or kill by port)
lsof -ti:3987 | xargs kill -9 2>/dev/null || true
rm -rf .playwright-mcp
```

- [ ] **Step 4: Run existing admin logic tests to confirm no regressions**

```bash
npx tsx --test src/lib/admin/*.test.mjs
```
Expected: all tests pass (12/12, unchanged from before — this task touches only UI).

---

## Self-Review Notes

- **Spec coverage:** Sidebar (Task 2), Dashboard icons/alerts/top-sales (Task 3), Catalog search/filters/badges/photo placeholder/icon buttons/sticky bulk bar (Task 4), Orders tabs/badges/chevron/contact icon (Task 5), Login icons (Task 6), BulkPriceModal icon (Task 7) — all spec sections covered. Color token table from spec is embedded directly in each task's class names.
- **Type consistency:** `STATUS_ICON_COMPONENTS`/`STATUS_TAB_ICONS` use `React.ComponentType<{ className?: string }>` — flagged as needing `import type { ComponentType } from 'react'` fallback if `React` namespace isn't globally available (Next.js with `jsx: react-jsx` typically doesn't require importing `React` but the namespace `React.ComponentType` as a *type* still needs `React` types in scope; since `@types/react` is a global ambient module this should resolve, but the fallback is documented in case it doesn't).
- **No placeholders:** all steps contain full code.
