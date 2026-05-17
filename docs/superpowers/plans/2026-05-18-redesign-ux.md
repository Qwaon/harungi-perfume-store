# HARUNGI UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать UX сайта — убрать лишние блоки с главной, добавить нижнюю мобильную навигацию, заменить sidebar-фильтры на горизонтальные чипы, сделать цену и CTA на карточках всегда видимыми.

**Architecture:** Стиль (цвета, шрифты, анимации) не меняется. Меняется только структура страниц и UX-паттерны. Добавляются два новых компонента: `BottomNav` (нижняя навигация) и `QuickAddSheet` (быстрое добавление в корзину из каталога). Существующие компоненты рефакторятся на месте.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, CartContext (useCart)

---

## File Map

| Действие | Файл | Что меняется |
|---|---|---|
| Создать | `src/components/BottomNav.tsx` | Нижняя панель: Главная / Каталог / Корзина |
| Создать | `src/components/TrustStrip.tsx` | Однострочный блок доверия |
| Создать | `src/components/QuickAddSheet.tsx` | Bottom sheet выбора объёма из каталога |
| Изменить | `src/app/layout.tsx` | Добавить BottomNav, `pb-20 md:pb-0` на main |
| Изменить | `src/app/page.tsx` | Убрать 5 секций, добавить TrustStrip, показывать 4 featured |
| Изменить | `src/components/Hero.tsx` | Убрать Telegram CTA, убрать подзаголовок, оставить один CTA + stats |
| Изменить | `src/components/FeaturedPerfumes.tsx` | Убрать label "Избранное", 4 колонки десктоп / 2 мобиль |
| Изменить | `src/components/Header.tsx` | Десктоп: убрать кнопку "Заказать". Мобиль: убрать корзину-иконку и бургер (навигация в BottomNav) |
| Изменить | `src/components/ProductCard.tsx` | Убрать hover-overlay, добавить постоянный блок цены + кнопки |
| Изменить | `src/components/CatalogClient.tsx` | Убрать sidebar, добавить chip-фильтры + кнопка "Ещё фильтры" |

---

## Task 1: BottomNav компонент

**Files:**
- Create: `src/components/BottomNav.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// src/components/BottomNav.tsx
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
```

- [ ] **Step 2: Интегрировать в layout**

В `src/app/layout.tsx` добавить импорт и вставить `<BottomNav />` и отступ снизу:

```tsx
import BottomNav from '@/components/BottomNav';

// в RootLayout, внутри CartProvider:
<Header />
<CartDrawer />
<main className="flex-1 pb-20 md:pb-0">{children}</main>
<Footer />
<BottomNav />
```

- [ ] **Step 3: Запустить и проверить**

```bash
npm run dev
```

Открыть http://localhost:3000 на ширине 390px (DevTools mobile). Убедиться:
- Нижняя панель видна: Главная / Каталог / Корзина
- На десктопе (md+) панель скрыта
- Активный пункт подсвечивается тёмным
- Контент не перекрывается панелью (есть pb-20)

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.tsx src/app/layout.tsx
git commit -m "feat: add mobile bottom navigation bar"
```

---

## Task 2: Упростить Header

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Убрать кнопку "Заказать" с десктопа, убрать мобильные элементы**

Заменить весь файл `src/components/Header.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/catalog', label: 'Каталог' },
    { href: '/about', label: 'О нас' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-cream-100/95 backdrop-blur-md' : 'bg-transparent'
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="font-display text-xl md:text-2xl font-light tracking-[0.3em] text-ink-900 hover:opacity-70 transition-opacity duration-200">
            HARUNGI
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="label text-ink-500 hover:text-ink-900 transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-ink-900 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
            <button
              onClick={openCart}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-200/50 transition-colors"
              aria-label="Корзина"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ink-900 text-cream-50 text-[10px] rounded-full flex items-center justify-center font-medium">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          </nav>

          {/* Mobile: только логотип, навигация в BottomNav */}
        </div>
      </motion.header>

      {/* Desktop mobile menu — оставляем для md breakpoint не нужен, но сохраним на случай планшет */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-cream-100 flex flex-col items-center justify-center gap-10 hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-display text-3xl font-light text-ink-700 hover:text-ink-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Проверить**

```bash
npm run dev
```

Десктоп: в хедере нет кнопки "Заказать", есть иконка корзины.
Мобиль (390px): хедер показывает только логотип HARUNGI. Нет бургера, нет иконки корзины — они в BottomNav.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "refactor: simplify header — remove order button, mobile nav moved to BottomNav"
```

---

## Task 3: TrustStrip компонент

**Files:**
- Create: `src/components/TrustStrip.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// src/components/TrustStrip.tsx
const TRUST_ITEMS = [
  'Оригиналы с гарантией',
  'Распивы от 5 мл',
  'Доставка по России',
  'Заказ через Telegram',
];

export default function TrustStrip() {
  return (
    <div className="bg-cream-100 border-t border-cream-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {TRUST_ITEMS.map((item) => (
          <span key={item} className="flex items-center gap-2 text-xs text-ink-500 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TrustStrip.tsx
git commit -m "feat: add TrustStrip component — compact single-row trust bar"
```

---

## Task 4: Переработать главную страницу

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/FeaturedPerfumes.tsx`

- [ ] **Step 1: Обновить page.tsx**

Заменить содержимое `src/app/page.tsx`:

```tsx
import Hero from '@/components/Hero';
import FeaturedPerfumes from '@/components/FeaturedPerfumes';
import TrustStrip from '@/components/TrustStrip';
import { perfumes } from '@/data/perfumes';

export default function HomePage() {
  const featured = perfumes.filter((p) => p.featured && p.inStock).slice(0, 4);

  return (
    <>
      <Hero />
      <FeaturedPerfumes perfumes={featured} />
      <TrustStrip />
    </>
  );
}
```

- [ ] **Step 2: Упростить Hero.tsx**

Заменить содержимое `src/components/Hero.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Hero() {
  return (
    <section
      className="relative min-h-dvh flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1c1a17 60%, #0A0A0A 100%)' }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-24 w-full">
        <motion.h1
          className="font-display text-[3rem] sm:text-6xl md:text-7xl xl:text-[7rem] font-light leading-[1.02] text-white mb-10 max-w-3xl text-balance"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
        >
          Нишевая<br />
          <span className="italic text-cream-300">парфюмерия</span>
        </motion.h1>

        <motion.div
          className="mb-20"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
        >
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 bg-cream-50 text-ink-900 px-8 py-3.5 text-sm tracking-widest uppercase font-medium rounded-full transition-all duration-200 hover:bg-white hover:-translate-y-px cursor-pointer"
            style={{ boxShadow: '0px 0px 0px 1px rgba(209,207,197,0.3)' }}
          >
            Смотреть каталог
          </Link>
        </motion.div>

        <motion.div
          className="flex gap-8 sm:gap-12 border-t border-white/10 pt-8"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
        >
          {[
            { value: '200+', label: 'Ароматов' },
            { value: '20+', label: 'Брендов' },
            { value: 'от 5 мл', label: 'Распивы' },
            { value: '100%', label: 'Оригинал' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-3xl sm:text-4xl font-light text-white tabular-nums">{stat.value}</p>
              <p className="label text-cream-300/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        >
          <svg width="20" height="11" viewBox="0 0 20 11" fill="none" aria-hidden="true">
            <path d="M1 1l9 9 9-9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 3: Обновить FeaturedPerfumes.tsx**

Заменить содержимое `src/components/FeaturedPerfumes.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { Perfume } from '@/types';

interface Props {
  perfumes: Perfume[];
}

export default function FeaturedPerfumes({ perfumes }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
      <div className="flex items-baseline justify-between mb-10">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Популярное
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <Link href="/catalog" className="text-sm text-gold-500 hover:text-ink-900 transition-colors duration-200">
            Весь каталог →
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {perfumes.map((p, i) => (
          <ProductCard key={p.id} perfume={p} index={i} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Проверить главную**

```bash
npm run dev
```

Открыть http://localhost:3000. Убедиться:
- Hero: нет кнопки Telegram, один CTA "Смотреть каталог", 4 stat (200+/20+/от 5 мл/100%)
- FeaturedPerfumes: заголовок "Популярное", ссылка "Весь каталог →" справа, сетка 2 (мобиль) / 4 (десктоп)
- TrustStrip: одна строка снизу с 4 фактами
- Нет TrustSection, SocialProof, Guarantees, DecantsBanner, FinalCTA

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/Hero.tsx src/components/FeaturedPerfumes.tsx
git commit -m "feat: redesign homepage — product-first layout, remove trust sections, simplify hero"
```

---

## Task 5: QuickAddSheet — быстрое добавление в корзину

**Files:**
- Create: `src/components/QuickAddSheet.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// src/components/QuickAddSheet.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Perfume, Volume, CartItem } from '@/types';
import { VOLUME_LABELS } from '@/lib/constants';
import { useCart } from '@/contexts/CartContext';

interface Props {
  perfume: Perfume | null;
  onClose: () => void;
}

export default function QuickAddSheet({ perfume, onClose }: Props) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Volume | null>(null);
  const [added, setAdded] = useState(false);

  if (!perfume) return null;

  const handleAdd = () => {
    if (!selected) return;
    const price = perfume.prices[selected];
    if (price === undefined) return;
    const item: CartItem = {
      perfumeId: perfume.id,
      perfumeName: perfume.name,
      brand: perfume.brand,
      volume: selected,
      volumeLabel: VOLUME_LABELS[selected],
      price,
    };
    addItem(item);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setSelected(null);
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      {perfume && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl p-6 md:max-w-md md:left-auto md:right-6 md:bottom-6 md:rounded-2xl"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-cream-200 rounded-full mx-auto mb-5 md:hidden" />

            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="label text-ink-300 mb-1">{perfume.brand}</p>
                <h3 className="font-display text-xl font-light text-ink-900">{perfume.name}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center hover:bg-cream-200 transition-colors shrink-0 ml-4"
                aria-label="Закрыть"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="#141413" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Volume options */}
            <div className="flex flex-wrap gap-2 mb-6">
              {perfume.availableVolumes.map((vol) => {
                const price = perfume.prices[vol];
                if (price === undefined) return null;
                const active = selected === vol;
                return (
                  <button
                    key={vol}
                    onClick={() => setSelected(vol)}
                    className={`px-4 py-2.5 rounded-xl border text-sm transition-all duration-150 ${
                      active
                        ? 'bg-ink-900 text-white border-ink-900'
                        : 'bg-cream-50 text-ink-700 border-cream-200 hover:border-ink-500'
                    }`}
                  >
                    <span className="font-medium">{VOLUME_LABELS[vol]}</span>
                    <span className={`ml-2 text-xs ${active ? 'text-white/70' : 'text-ink-300'}`}>
                      {price.toLocaleString('ru-RU')} ₽
                    </span>
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <button
              onClick={handleAdd}
              disabled={!selected || added}
              className="btn-primary w-full py-3.5 disabled:opacity-40 disabled:translate-y-0"
            >
              {added ? '✓ Добавлено в корзину' : 'Добавить в корзину'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuickAddSheet.tsx
git commit -m "feat: add QuickAddSheet — volume picker bottom sheet for catalog quick-add"
```

---

## Task 6: Переработать ProductCard

**Files:**
- Modify: `src/components/ProductCard.tsx`

- [ ] **Step 1: Обновить ProductCard.tsx**

Карточка теперь принимает `onQuickAdd` callback. Hover-overlay убирается, добавляется постоянный блок внизу.

```tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Perfume } from '@/types';

interface Props {
  perfume: Perfume;
  index?: number;
  onQuickAdd?: (perfume: Perfume) => void;
}

export default function ProductCard({ perfume, index = 0, onQuickAdd }: Props) {
  const minPrice = Math.min(...Object.values(perfume.prices));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="group">
        {/* Image */}
        <Link href={`/product/${perfume.id}`} className="block relative overflow-hidden bg-cream-200 aspect-[3/4] rounded-xl mb-3">
          <Image
            src={perfume.images[0]}
            alt={`${perfume.name} — ${perfume.brand}`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/5 transition-colors duration-500 rounded-xl" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {perfume.bestseller && (
              <span
                className="text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md text-cream-50"
                style={{ backgroundColor: '#8a5a44' }}
              >
                Хит
              </span>
            )}
            {perfume.newArrival && (
              <span className="bg-ink-900 text-white text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md">
                Новинка
              </span>
            )}
            {perfume.format === 'распив' && (
              <span className="bg-cream-50/90 text-ink-900 text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md backdrop-blur-sm">
                Распив
              </span>
            )}
          </div>
        </Link>

        {/* Info + CTA */}
        <div>
          <p className="label text-ink-300 mb-1">{perfume.brand}</p>
          <Link href={`/product/${perfume.id}`}>
            <h3 className="font-display text-lg font-light text-ink-900 hover:text-ink-500 transition-colors duration-200 leading-tight mb-2">
              {perfume.name}
            </h3>
          </Link>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-900">
              от {minPrice.toLocaleString('ru-RU')} ₽
            </p>
            {onQuickAdd ? (
              <button
                onClick={() => onQuickAdd(perfume)}
                className="text-xs text-ink-500 hover:text-ink-900 border border-cream-200 hover:border-ink-500 px-3 py-1.5 rounded-full transition-all duration-150 shrink-0"
              >
                + В корзину
              </button>
            ) : (
              <p className="text-xs text-ink-300 capitalize">{perfume.gender}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Проверить**

```bash
npm run dev
```

Открыть каталог. Убедиться: карточки показывают цену и кнопку "+ В корзину" постоянно, не только на hover. На главной (где `onQuickAdd` не передаётся) карточки показывают гендер вместо кнопки — это ок, на главной клик ведёт на страницу товара.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "refactor: ProductCard — remove hover overlay, always-visible price and CTA"
```

---

## Task 7: Переработать CatalogClient — chip-фильтры

**Files:**
- Modify: `src/components/CatalogClient.tsx`

- [ ] **Step 1: Заменить CatalogClient.tsx**

Убрать sidebar, добавить горизонтальную строку чипов и QuickAddSheet.

```tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard';
import QuickAddSheet from './QuickAddSheet';
import { Perfume, FilterState } from '@/types';
import { brands, genders, scentTypes, formats } from '@/data/perfumes';

interface Props {
  perfumes: Perfume[];
}

const EMPTY_FILTERS: FilterState = { brand: '', gender: '', scentType: '', format: '', season: '', intensity: '' };
type SortOption = 'default' | 'popular' | 'price_asc' | 'price_desc' | 'new';
const PAGE_SIZE = 12;

const SORT_LABELS: Record<SortOption, string> = {
  default: 'По умолчанию',
  popular: 'Популярные',
  price_asc: 'Цена ↑',
  price_desc: 'Цена ↓',
  new: 'Новинки',
};

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 text-xs rounded-full border font-medium transition-all duration-150 ${
        active
          ? 'bg-ink-900 text-white border-ink-900'
          : 'bg-cream-50 text-ink-500 border-cream-200 hover:border-ink-500 hover:text-ink-900'
      }`}
    >
      {label}
    </button>
  );
}

export default function CatalogClient({ perfumes }: Props) {
  const searchParams = useSearchParams();
  const initialFormat = searchParams.get('format') ?? '';
  const [filters, setFilters] = useState<FilterState>({ ...EMPTY_FILTERS, format: initialFormat });
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('default');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [quickAddPerfume, setQuickAddPerfume] = useState<Perfume | null>(null);

  const setFilter = (key: keyof FilterState, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? '' : value }));

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setSort('default');
    setPriceMin('');
    setPriceMax('');
  };

  const priceActive = priceMin !== '' || priceMax !== '';
  const activeFilterCount =
    Object.values(filters).filter(Boolean).length + (priceActive ? 1 : 0);

  const filtered = useMemo(() => {
    const minVal = priceMin ? parseInt(priceMin) : 0;
    const maxVal = priceMax ? parseInt(priceMax) : Infinity;
    let result = perfumes.filter((p) => {
      if (filters.brand && p.brand !== filters.brand) return false;
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.scentType && p.scentType !== filters.scentType) return false;
      if (filters.format && p.format !== filters.format) return false;
      if (filters.season && !p.season.includes(filters.season as never)) return false;
      if (filters.intensity && p.intensity !== filters.intensity) return false;
      const minP = Math.min(...Object.values(p.prices));
      if (minVal > 0 && minP < minVal) return false;
      if (maxVal < Infinity && minP > maxVal) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sort === 'popular') result = [...result].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    if (sort === 'price_asc') result = [...result].sort((a, b) => Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices)));
    if (sort === 'price_desc') result = [...result].sort((a, b) => Math.min(...Object.values(b.prices)) - Math.min(...Object.values(a.prices)));
    if (sort === 'new') result = [...result].sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    return result;
  }, [perfumes, filters, search, sort, priceMin, priceMax]);

  useEffect(() => { setCurrentPage(1); }, [filters, search, sort, priceMin, priceMax]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);

  return (
    <div>
      {/* Search + sort */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или бренду..."
            className="input-base pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-cream-200 hover:bg-cream-300 flex items-center justify-center transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="#5e5d59" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="input-base sm:w-40 cursor-pointer"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
            <option key={k} value={k}>{SORT_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* Chip filters row */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {/* Format chips */}
        <Chip label="Все" active={!filters.format} onClick={() => setFilter('format', '')} />
        {formats.map((f) => (
          <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filters.format === f} onClick={() => setFilter('format', f)} />
        ))}

        <div className="w-px h-5 bg-cream-200 shrink-0 mx-1" />

        {/* Gender chips */}
        {genders.map((g) => (
          <Chip key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} active={filters.gender === g} onClick={() => setFilter('gender', g)} />
        ))}

        <div className="w-px h-5 bg-cream-200 shrink-0 mx-1" />

        {/* ScentType chips — first 4 */}
        {scentTypes.slice(0, 4).map((s) => (
          <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={filters.scentType === s} onClick={() => setFilter('scentType', s)} />
        ))}

        {/* More filters button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs rounded-full border font-medium transition-all duration-150 ${
            activeFilterCount > (filters.format ? 1 : 0) + (filters.gender ? 1 : 0) + (scentTypes.slice(0, 4).includes(filters.scentType as never) && filters.scentType ? 1 : 0)
              ? 'bg-ink-900 text-white border-ink-900'
              : 'bg-cream-50 text-ink-500 border-cream-200 hover:border-ink-500 hover:text-ink-900'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Ещё{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="shrink-0 text-xs text-ink-300 hover:text-ink-900 transition-colors px-2"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-300">{filtered.length} позиций</p>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {paginated.map((p, i) => (
              <ProductCard key={p.id} perfume={p} index={i} onQuickAdd={setQuickAddPerfume} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-10 md:mt-12">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPageSafe === 1}
                className="btn-outline px-5 py-3 disabled:opacity-40 disabled:translate-y-0"
              >
                Назад
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;
                const active = page === currentPageSafe;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-11 h-11 rounded-full text-sm transition-colors ${
                      active ? 'bg-ink-900 text-white' : 'bg-cream-50 text-ink-500 hover:text-ink-900'
                    }`}
                    style={{ boxShadow: active ? '0px 0px 0px 1px #141413' : '0px 0px 0px 1px #e8e6dc' }}
                    aria-label={`Страница ${page}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPageSafe === totalPages}
                className="btn-outline px-5 py-3 disabled:opacity-40 disabled:translate-y-0"
              >
                Далее
              </button>
            </div>
          )}
        </>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center py-24 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#87867f" strokeWidth="1.5"/>
              <path d="M21 21l-4.35-4.35" stroke="#87867f" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-display text-3xl font-light text-ink-900 mb-2">Ничего не найдено</p>
          <p className="text-ink-300 text-sm mb-8">Попробуйте изменить фильтры или поисковый запрос</p>
          <button onClick={clearAll} className="btn-outline">Сбросить всё</button>
        </motion.div>
      )}

      {/* More filters sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 w-[85vw] max-w-[340px] bg-cream-50 shadow-2xl overflow-y-auto flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between p-5 border-b border-cream-200 sticky top-0 bg-cream-50 z-10">
                <p className="font-semibold text-ink-900">Ещё фильтры</p>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center hover:bg-cream-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="#141413" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-6">
                {/* All scent types */}
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-ink-900 mb-3">Тип аромата</p>
                  <div className="flex flex-wrap gap-2">
                    {scentTypes.map((s) => (
                      <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={filters.scentType === s} onClick={() => setFilter('scentType', s)} />
                    ))}
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-ink-900 mb-3">Бренд</p>
                  <div className="flex flex-col max-h-48 overflow-y-auto gap-1">
                    {brands.map((b) => (
                      <button
                        key={b}
                        onClick={() => setFilter('brand', b)}
                        className={`text-left text-sm py-1.5 px-2 rounded-lg transition-colors ${
                          filters.brand === b ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-cream-100'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-ink-900 mb-3">Цена, ₽</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} placeholder="от" value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-700 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-ink-300 shrink-0">—</span>
                    <input
                      type="number" min={0} placeholder="до" value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-700 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-cream-200 sticky bottom-0 bg-cream-50" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
                <button onClick={() => setMoreOpen(false)} className="btn-primary w-full">
                  Показать {filtered.length} позиций
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* QuickAdd Sheet */}
      <QuickAddSheet perfume={quickAddPerfume} onClose={() => setQuickAddPerfume(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Проверить каталог**

```bash
npm run dev
```

Открыть http://localhost:3000/catalog. Убедиться:
- Нет левого sidebar
- Горизонтальная строка чипов: Все / Распивы / Оригиналы / Мужской / Женский / Унисекс / типы / Ещё
- Клик "+ В корзину" на карточке открывает QuickAddSheet снизу
- В QuickAddSheet выбор объёма → "Добавить в корзину" → sheet закрывается
- Мобиль (390px): чипы скроллятся горизонтально
- Кнопка "Ещё" открывает правый drawer с брендом, ценой, полными типами

- [ ] **Step 3: Commit**

```bash
git add src/components/CatalogClient.tsx
git commit -m "feat: replace sidebar filters with horizontal chips, add quick-add from catalog"
```

---

## Task 8: Финальная проверка и build

- [ ] **Step 1: Проверить TypeScript**

```bash
npm run build
```

Ожидаемый вывод: `✓ Compiled successfully`. Если ошибки — исправить.

- [ ] **Step 2: Проверить мобиль (390px в DevTools)**

Открыть http://localhost:3000 (главная):
- Hero с одним CTA и 4 stats
- 2-колонная сетка товаров
- TrustStrip снизу
- BottomNav виден внизу
- Контент не перекрыт BottomNav

Открыть http://localhost:3000/catalog:
- Поиск, чипы, сетка 2 колонки
- BottomNav виден, активный пункт "Каталог" подсвечен
- Клик "+ В корзину" → QuickAddSheet появляется снизу

- [ ] **Step 3: Проверить десктоп (1280px)**

Главная: Hero, 4-колонная сетка, TrustStrip. Нет BottomNav.
Каталог: chips, 3–4 колонки, нет sidebar. Клик "Ещё" → правый drawer.
Хедер: логотип, Каталог / О нас / FAQ, иконка корзины. Нет кнопки "Заказать".

- [ ] **Step 4: Финальный commit**

```bash
git add -A
git commit -m "chore: UX redesign complete — homepage, catalog chips, BottomNav, QuickAddSheet"
```
