# Cart + Volumes + Product Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-item cart with localStorage, update decant volumes to 5/10/15/20 ml with dynamic original volume, and reorder the product page so volume selector and buy buttons appear before product details.

**Architecture:** A `CartContext` (React context + localStorage) provides cart state to the whole app. The `Header` shows a cart badge and opens a `CartDrawer` slide-out panel. The product page gains an "Add to cart" button alongside the existing "Order" button. Checkout from the drawer uses a new `CartCheckoutModal` that sends all items in one payload.

**Tech Stack:** Next.js 14 App Router, TypeScript, Framer Motion, Tailwind CSS, localStorage

---

## File Map

**Create:**
- `src/contexts/CartContext.tsx` — cart state, localStorage sync, `useCart` hook
- `src/components/CartDrawer.tsx` — slide-out cart panel, item list, total, checkout trigger
- `src/components/CartCheckoutModal.tsx` — multi-item order form, sends `CartOrderPayload`

**Modify:**
- `src/types/index.ts` — `Volume` type, `Perfume.originalVolumeMl`, `CartItem`, `CartOrderPayload`
- `src/lib/constants.ts` — `VOLUME_LABELS` and `VOLUME_HINTS` for 5/10/15/20/original
- `src/app/layout.tsx` — wrap body with `CartProvider`, render `CartDrawer`
- `src/components/Header.tsx` — cart icon with count badge, opens drawer
- `src/components/VolumeSelector.tsx` — `originalVolumeMl` prop, dynamic label for `'original'`
- `src/components/ProductPageClient.tsx` — reorder blocks (volume+CTA first), "Add to cart" button, pass `originalVolumeMl`
- `src/components/OrderModal.tsx` — handle `'original'` volume label via `volumeLabel` prop
- `scripts/sync-catalog.mjs` — new Airtable fields: `price_15ml`, `price_20ml`, `price_original`, `original_volume_ml`

---

## Task 1: Update types and constants

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Update `src/types/index.ts`**

Replace the entire file with:

```ts
export type Volume = '5ml' | '10ml' | '15ml' | '20ml' | 'original';
export type Gender = 'мужской' | 'женский' | 'унисекс';
export type ScentType =
  | 'цветочный'
  | 'восточный'
  | 'древесный'
  | 'свежий'
  | 'фужерный'
  | 'шипровый'
  | 'гурманский';

export type Format = 'оригинал' | 'распив';
export type Occasion = 'офис' | 'вечер' | 'ежедневно' | 'свидание' | 'путешествие';
export type Season = 'весна' | 'лето' | 'осень' | 'зима' | 'всесезонный';
export type Intensity = 'лёгкий' | 'средний' | 'насыщенный';
export type SourceType = 'retail' | 'decant';

export interface Perfume {
  id: string;
  name: string;
  brand: string;
  description: string;
  notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  gender: Gender;
  scentType: ScentType;
  format: Format;
  images: string[];
  prices: Partial<Record<Volume, number>>;
  availableVolumes: Volume[];
  originalVolumeMl?: number;
  featured: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
  occasion: Occasion[];
  season: Season[];
  intensity: Intensity;
  inStock: boolean;
  sourceType: SourceType;
}

export interface CartItem {
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volume: Volume;
  volumeLabel: string;
  price: number;
}

export interface OrderPayload {
  name: string;
  contact: string;
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volume: Volume;
  volumeLabel: string;
  price: number;
  source: string;
  pageUrl: string;
  pagePath: string;
  timestamp: string;
  messageType: 'order' | 'consultation';
}

export interface CartOrderPayload {
  name: string;
  contact: string;
  items: CartItem[];
  total: number;
  source: string;
  pageUrl: string;
  pagePath: string;
  timestamp: string;
  messageType: 'cart-order';
}

export interface FilterState {
  brand: string;
  gender: string;
  scentType: string;
  format: string;
  season: string;
  intensity: string;
}
```

- [ ] **Step 2: Update `src/lib/constants.ts`**

Replace the entire file with:

```ts
import type { Volume } from '@/types';

export const TELEGRAM_URL = 'https://t.me/alsharkisia';

export const VOLUME_LABELS: Record<Volume, string> = {
  '5ml': '5 мл',
  '10ml': '10 мл',
  '15ml': '15 мл',
  '20ml': '20 мл',
  'original': 'Оригинал',
};

export const VOLUME_HINTS: Record<Volume, string> = {
  '5ml': '~50 нанесений',
  '10ml': '~100 нанесений',
  '15ml': '~150 нанесений',
  '20ml': '~200 нанесений',
  'original': 'Полный флакон',
};
```

- [ ] **Step 3: Run TypeScript check to see what broke**

```bash
cd /Users/a1/Desktop/проекты/perfume-store && npx tsc --noEmit 2>&1 | head -60
```

This will list every file that references old Volume values (`2ml`, `50ml`, `100ml`). Use the output to guide Tasks 2–8.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/constants.ts
git commit -m "feat: update Volume type and constants for new decant/original volumes"
```

---

## Task 2: Update sync-catalog script

**Files:**
- Modify: `scripts/sync-catalog.mjs`

- [ ] **Step 1: Update `parseVolumes` and `prices` in `transformRecord`**

In `scripts/sync-catalog.mjs`, replace the `parseVolumes` function and the `prices` block (lines 86–99) with:

```js
const parseVolumes = (f) => {
  const vols = [];
  for (const v of ['5ml', '10ml', '15ml', '20ml']) {
    if (f[`price_${v}`] != null && f[`price_${v}`] !== '') vols.push(v);
  }
  if (f['price_original'] != null && f['price_original'] !== '') vols.push('original');
  return vols;
};

const prices = {};
for (const v of ['5ml', '10ml', '15ml', '20ml']) {
  const val = f[`price_${v}`];
  if (val != null && val !== '') prices[v] = Number(val);
}
if (f['price_original'] != null && f['price_original'] !== '') {
  prices['original'] = Number(f['price_original']);
}
```

- [ ] **Step 2: Add `originalVolumeMl` to the returned object**

In the `return { ... }` block of `transformRecord`, after `availableVolumes`, add:

```js
originalVolumeMl: f['original_volume_ml'] ? Number(f['original_volume_ml']) : undefined,
```

> **Note for user:** Add these columns to your Airtable Catalog table:
> - `price_15ml` (Number)
> - `price_20ml` (Number)
> - `price_original` (Number) — price for the full bottle
> - `original_volume_ml` (Number) — actual bottle size in ml (e.g. 50, 75, 100)
>
> The old columns `price_2ml`, `price_50ml`, `price_100ml` can be removed from Airtable after migration. Run `npm run sync-catalog` after updating Airtable.

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-catalog.mjs
git commit -m "feat: update sync-catalog for new volume fields (15ml, 20ml, original)"
```

---

## Task 3: Create CartContext

**Files:**
- Create: `src/contexts/CartContext.tsx`

- [ ] **Step 1: Create `src/contexts/CartContext.tsx`**

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '@/types';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (perfumeId: string, volume: string) => void;
  clearCart: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('harungi-cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('harungi-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const exists = prev.find(
        (i) => i.perfumeId === item.perfumeId && i.volume === item.volume
      );
      if (exists) return prev;
      return [...prev, item];
    });
  };

  const removeItem = (perfumeId: string, volume: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.perfumeId === perfumeId && i.volume === volume))
    );
  };

  const clearCart = () => setItems([]);
  const total = items.reduce((sum, i) => sum + i.price, 0);
  const count = items.length;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        total,
        count,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/CartContext.tsx
git commit -m "feat: add CartContext with localStorage persistence"
```

---

## Task 4: Update VolumeSelector

**Files:**
- Modify: `src/components/VolumeSelector.tsx`

- [ ] **Step 1: Replace `src/components/VolumeSelector.tsx`**

```tsx
'use client';

import { Volume } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { VOLUME_LABELS, VOLUME_HINTS } from '@/lib/constants';

interface Props {
  availableVolumes: Volume[];
  prices: Partial<Record<Volume, number>>;
  selected: Volume;
  onChange: (v: Volume) => void;
  originalVolumeMl?: number;
}

function getVolumeLabel(volume: Volume, originalVolumeMl?: number): string {
  if (volume === 'original' && originalVolumeMl) return `${originalVolumeMl} мл`;
  return VOLUME_LABELS[volume];
}

function VolumeButton({
  volume,
  price,
  selected,
  onClick,
  originalVolumeMl,
}: {
  volume: Volume;
  price: number | undefined;
  selected: boolean;
  onClick: () => void;
  originalVolumeMl?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3.5 rounded-xl text-left transition-all duration-200 focus:outline-none ${
        selected
          ? 'bg-ink-900 text-white'
          : 'bg-cream-50 text-ink-700 hover:-translate-y-px'
      }`}
      style={{
        boxShadow: selected
          ? '0px 0px 0px 1px #141413, 0px 4px 12px rgba(0,0,0,0.1)'
          : '0px 0px 0px 1px #e8e6dc',
      }}
    >
      <span className="flex items-baseline gap-2">
        <span className="text-sm">{getVolumeLabel(volume, originalVolumeMl)}</span>
        <span className={`text-xs ${selected ? 'text-white/50' : 'text-ink-300'}`}>
          {VOLUME_HINTS[volume]}
        </span>
      </span>
      <span className={`block text-xs mt-1 ${selected ? 'text-white/60' : 'text-ink-300'}`}>
        {price?.toLocaleString('ru-RU')} ₽
      </span>
    </button>
  );
}

export default function VolumeSelector({
  availableVolumes,
  prices,
  selected,
  onChange,
  originalVolumeMl,
}: Props) {
  const handleChange = (v: Volume) => {
    trackEvent('volume_select', { volume: v, price: prices[v] });
    onChange(v);
  };

  const decants = availableVolumes.filter((v) => v !== 'original');
  const bottles = availableVolumes.filter((v) => v === 'original');

  return (
    <div className="flex flex-col gap-6">
      {decants.length > 0 && (
        <div>
          <p className="label text-ink-300 mb-3">Распивы</p>
          <div className="flex flex-wrap gap-2.5">
            {decants.map((v) => (
              <VolumeButton
                key={v}
                volume={v}
                price={prices[v]}
                selected={selected === v}
                onClick={() => handleChange(v)}
              />
            ))}
          </div>
        </div>
      )}
      {bottles.length > 0 && (
        <div>
          <p className="label text-ink-300 mb-3">Оригинал (полный флакон)</p>
          <div className="flex flex-wrap gap-2.5">
            {bottles.map((v) => (
              <VolumeButton
                key={v}
                volume={v}
                price={prices[v]}
                selected={selected === v}
                onClick={() => handleChange(v)}
                originalVolumeMl={originalVolumeMl}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VolumeSelector.tsx
git commit -m "feat: update VolumeSelector for new volumes and dynamic original label"
```

---

## Task 5: Update OrderModal

**Files:**
- Modify: `src/components/OrderModal.tsx`

The modal now receives a `volumeLabel: string` (pre-computed by caller) instead of looking it up from `VOLUME_LABELS`. This handles the `'original'` case where the label must show actual ml.

- [ ] **Step 1: Update Props interface in `OrderModal.tsx`**

Change the `Props` interface (lines 9–17):

```tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
  perfumeName: string;
  perfumeId: string;
  brand: string;
  volume: Volume;
  volumeLabel: string;
  price: number;
}
```

- [ ] **Step 2: Update the component signature and remove `volumeLabels` usage**

Change the export line and remove the internal `const volumeLabels = VOL_LABELS;` line.

New export line:
```tsx
export default function OrderModal({ isOpen, onClose, perfumeName, perfumeId, brand, volume, volumeLabel, price }: Props) {
```

Remove:
```tsx
const volumeLabels = VOL_LABELS;
```

Remove the `VOLUME_LABELS as VOL_LABELS` import (keep `TELEGRAM_URL`).

- [ ] **Step 3: Replace `volumeLabels[volume]` usage**

In `createFallbackMessage` (called with `payload`), replace `volumeLabels[payload.volume]` with `payload.volumeLabel`.

In the JSX rendering (the order summary box, ~line 274), replace `{volumeLabels[volume]}` with `{volumeLabel}`.

- [ ] **Step 4: Update `OrderPayload` construction in `handleSubmit`**

Add `volumeLabel` to the payload object:

```tsx
const payload: OrderPayload = {
  name: trimmedName,
  contact: trimmedContact,
  perfumeId,
  perfumeName,
  brand,
  volume,
  volumeLabel,
  price,
  source: detectSource(),
  pageUrl: window.location.href,
  pagePath: window.location.pathname,
  timestamp: new Date().toISOString(),
  messageType: 'order',
};
```

- [ ] **Step 5: Commit**

```bash
git add src/components/OrderModal.tsx
git commit -m "feat: pass volumeLabel string to OrderModal for dynamic original volume display"
```

---

## Task 6: Create CartCheckoutModal

**Files:**
- Create: `src/components/CartCheckoutModal.tsx`

- [ ] **Step 1: Create `src/components/CartCheckoutModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem, CartOrderPayload } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { TELEGRAM_URL } from '@/lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onSuccess: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const ORDER_WEBHOOK_URL = process.env.NEXT_PUBLIC_ORDER_WEBHOOK_URL;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;
const MIN_CONTACT_LENGTH = 4;
const MAX_CONTACT_LENGTH = 80;
const MIN_SUBMIT_DELAY_MS = 1500;
const CLIENT_RATE_LIMIT_MS = 30_000;
const LAST_SUBMIT_KEY = 'harungi-last-order-submit-at';

function detectSource() {
  if (typeof window === 'undefined') return 'unknown';
  const params = new URLSearchParams(window.location.search);
  const rawUtm = params.get('utm_source') ?? '';
  const utmSource = rawUtm.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  if (utmSource) return `utm:${utmSource}`;
  if (document.referrer) {
    try {
      return `ref:${new URL(document.referrer).hostname.replace(/^www\./, '')}`;
    } catch {
      return 'ref:unknown';
    }
  }
  return 'direct';
}

function isValidName(value: string) {
  const t = value.trim();
  return t.length >= MIN_NAME_LENGTH && t.length <= MAX_NAME_LENGTH;
}

function isValidContact(value: string) {
  const t = value.trim();
  if (t.length < MIN_CONTACT_LENGTH || t.length > MAX_CONTACT_LENGTH) return false;
  return /^@?[a-zA-Z0-9_]{4,32}$/.test(t) || (/^\+?[0-9\s\-()]{7,20}$/.test(t) && t.replace(/\D/g, '').length >= 7);
}

function buildFallbackText(items: CartItem[], total: number, name: string, contact: string): string {
  const lines = ['Хочу заказать (корзина):'];
  items.forEach((item) => {
    lines.push(`• ${item.brand} — ${item.perfumeName} ${item.volumeLabel} — ${item.price.toLocaleString('ru-RU')} ₽`);
  });
  lines.push(`Итого: ${total.toLocaleString('ru-RU')} ₽`, '', `Имя: ${name}`, `Контакт: ${contact}`);
  return lines.join('\n');
}

export default function CartCheckoutModal({ isOpen, onClose, items, total, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [openedAt, setOpenedAt] = useState<number | null>(null);

  const handleClose = () => {
    if (status === 'loading') return;
    onClose();
    setTimeout(() => {
      setStatus('idle');
      setName('');
      setContact('');
      setWebsite('');
      setErrorMsg('');
      setOpenedAt(null);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();

    if (website.trim() !== '') { setStatus('success'); return; }
    if (!isValidName(trimmedName)) { setStatus('error'); setErrorMsg('Укажите имя от 2 до 60 символов.'); return; }
    if (!isValidContact(trimmedContact)) { setStatus('error'); setErrorMsg('Укажите корректный Telegram-ник или номер телефона.'); return; }
    if (openedAt && Date.now() - openedAt < MIN_SUBMIT_DELAY_MS) { setStatus('error'); setErrorMsg('Форма отправлена слишком быстро. Попробуйте ещё раз.'); return; }
    const lastSubmitAt = window.localStorage.getItem(LAST_SUBMIT_KEY);
    if (lastSubmitAt && Date.now() - Number(lastSubmitAt) < CLIENT_RATE_LIMIT_MS) { setStatus('error'); setErrorMsg('Повторная отправка доступна через 30 секунд.'); return; }

    const payload: CartOrderPayload = {
      name: trimmedName,
      contact: trimmedContact,
      items,
      total,
      source: detectSource(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      timestamp: new Date().toISOString(),
      messageType: 'cart-order',
    };

    setStatus('loading');
    setErrorMsg('');

    try {
      let sent = false;
      if (ORDER_WEBHOOK_URL) {
        const res = await fetch(ORDER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        sent = res.ok;
      }

      if (sent) {
        window.localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
        trackEvent('order_submit', { itemCount: items.length, total });
        setStatus('success');
        onSuccess();
      } else {
        const fallbackText = buildFallbackText(items, total, trimmedName, trimmedContact);
        window.open(`${TELEGRAM_URL}?text=${encodeURIComponent(fallbackText)}`, '_blank');
        trackEvent('order_fallback', { itemCount: items.length });
        setStatus('success');
        onSuccess();
      }
    } catch {
      setStatus('error');
      setErrorMsg('Не удалось отправить заявку. Попробуйте написать нам напрямую в Telegram.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
            <motion.div
              className="w-full sm:max-w-[480px] bg-cream-50 rounded-t-3xl sm:rounded-2xl pointer-events-auto flex flex-col"
              style={{ maxHeight: '92dvh', boxShadow: '0px 0px 0px 1px #e8e6dc, 0 25px 50px -12px rgba(0,0,0,0.25)' }}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onAnimationStart={() => { if (openedAt === null) setOpenedAt(Date.now()); }}
            >
              <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-cream-300" />
              </div>
              <div className="overflow-y-auto flex-1">
                <div className="sticky top-0 bg-cream-50 z-10 flex justify-end px-6 pt-4 pb-1">
                  <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors" aria-label="Закрыть">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1l12 12M13 1L1 13" stroke="#141413" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 pb-8 sm:px-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
                  {status === 'success' ? (
                    <motion.div className="text-center py-8" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                      <div className="w-16 h-16 rounded-full bg-gold-500 flex items-center justify-center mx-auto mb-6">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h3 className="font-display text-3xl font-light text-ink-900 mb-3">Заявка отправлена</h3>
                      <p className="text-ink-500 text-sm leading-relaxed mb-8">
                        Мы свяжемся с вами в ближайшее время через Telegram или по телефону.
                      </p>
                      <button onClick={handleClose} className="btn-primary w-full">Закрыть</button>
                    </motion.div>
                  ) : (
                    <>
                      <p className="label text-gold-500 mb-2">Оформить заказ</p>
                      <h3 className="font-display text-2xl font-light text-ink-900 mb-6">
                        {items.length} {items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'}
                      </h3>

                      <div className="flex flex-col gap-2 mb-6">
                        {items.map((item) => (
                          <div
                            key={`${item.perfumeId}-${item.volume}`}
                            className="bg-cream-100 rounded-xl px-4 py-3 flex justify-between items-center"
                            style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
                          >
                            <div>
                              <p className="text-sm text-ink-900">{item.perfumeName}</p>
                              <p className="text-xs text-ink-300">{item.brand} · {item.volumeLabel}</p>
                            </div>
                            <p className="font-display text-lg font-light text-ink-900 flex-shrink-0 ml-4">
                              {item.price.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-1 pt-2">
                          <p className="label text-ink-500">Итого</p>
                          <p className="font-display text-2xl font-light text-ink-900">
                            {total.toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="hidden" aria-hidden="true">
                          <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>
                        <div>
                          <label className="label text-ink-500 block mb-2">Ваше имя *</label>
                          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" className="input-base" />
                        </div>
                        <div>
                          <label className="label text-ink-500 block mb-2">Telegram или телефон *</label>
                          <input type="text" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@username или +7 900 000-00-00" className="input-base" />
                        </div>
                        {status === 'error' && (
                          <div className="text-sm bg-cream-100 rounded-xl px-4 py-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
                            <p className="text-ink-500">{errorMsg}</p>
                            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-gold-500 text-sm mt-2">
                              Написать напрямую
                            </a>
                          </div>
                        )}
                        <button type="submit" disabled={status === 'loading'} className="btn-primary w-full mt-2 disabled:opacity-50">
                          {status === 'loading' ? (
                            <span className="flex items-center gap-2">
                              <motion.span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
                              Отправляем...
                            </span>
                          ) : 'Отправить заявку'}
                        </button>
                        <p className="text-xs text-ink-300 text-center">Заявка — не оплата. Мы свяжемся для подтверждения заказа.</p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CartCheckoutModal.tsx
git commit -m "feat: add CartCheckoutModal for multi-item cart checkout"
```

---

## Task 7: Create CartDrawer

**Files:**
- Create: `src/components/CartDrawer.tsx`

- [ ] **Step 1: Create `src/components/CartDrawer.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import CartCheckoutModal from '@/components/CartCheckoutModal';

export default function CartDrawer() {
  const { items, removeItem, clearCart, total, count, isOpen, closeCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCart}
            />

            {/* Drawer */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-sm bg-cream-50 flex flex-col"
              style={{ boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5 border-b border-cream-200 flex-shrink-0"
                style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
              >
                <div>
                  <p className="label text-gold-500 mb-0.5">Корзина</p>
                  <p className="text-sm text-ink-300">{count} {count === 1 ? 'позиция' : count < 5 ? 'позиции' : 'позиций'}</p>
                </div>
                <button
                  onClick={closeCart}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors"
                  aria-label="Закрыть корзину"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="#141413" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <p className="font-display text-2xl font-light text-ink-300">Корзина пуста</p>
                    <p className="text-sm text-ink-300">Добавьте ароматы из каталога</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((item) => (
                      <div
                        key={`${item.perfumeId}-${item.volume}`}
                        className="bg-cream-100 rounded-2xl px-4 py-4 flex items-start gap-3"
                        style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-900 truncate">{item.perfumeName}</p>
                          <p className="text-xs text-ink-300 mt-0.5">{item.brand} · {item.volumeLabel}</p>
                          <p className="font-display text-xl font-light text-ink-900 mt-2">
                            {item.price.toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.perfumeId, item.volume)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors flex-shrink-0 mt-0.5"
                          aria-label="Удалить"
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1l12 12M13 1L1 13" stroke="#999" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={clearCart}
                      className="text-xs text-ink-300 hover:text-ink-500 transition-colors mt-1 text-left"
                    >
                      Очистить корзину
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div
                  className="border-t border-cream-200 px-6 py-5 flex-shrink-0"
                  style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="label text-ink-500">Итого</p>
                    <p className="font-display text-2xl font-light text-ink-900">
                      {total.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <button
                    onClick={() => setCheckoutOpen(true)}
                    className="btn-primary w-full"
                  >
                    Оформить заявку
                  </button>
                  <p className="text-xs text-ink-300 text-center mt-3">
                    Заявка — не оплата. Мы свяжемся для подтверждения.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CartCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={items}
        total={total}
        onSuccess={() => {
          setCheckoutOpen(false);
          clearCart();
          closeCart();
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CartDrawer.tsx
git commit -m "feat: add CartDrawer slide-out panel with item list and checkout"
```

---

## Task 8: Update layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Wrap body with CartProvider and render CartDrawer**

Replace the entire `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/contexts/CartContext';
import CartDrawer from '@/components/CartDrawer';

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
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wrap app with CartProvider and render CartDrawer globally"
```

---

## Task 9: Update Header with cart icon

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Add cart button to Header**

Add `'use client'` directive and `useCart` import at the top. The header is already `'use client'`.

At the top of the file, add the import:
```tsx
import { useCart } from '@/contexts/CartContext';
```

Inside the `Header` component, after the existing state declarations, add:
```tsx
const { count, openCart } = useCart();
```

- [ ] **Step 2: Add cart icon to desktop nav**

In the desktop nav (after the "Заказать" link button), add:

```tsx
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
```

- [ ] **Step 3: Add cart icon to mobile header (before burger button)**

In the mobile section, before the burger `<button>`, add:

```tsx
<button
  onClick={openCart}
  className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-200/50 transition-colors mr-1"
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add cart icon with count badge to Header"
```

---

## Task 10: Update ProductPageClient — reorder layout and add to cart

**Files:**
- Modify: `src/components/ProductPageClient.tsx`

This task has the most visual impact. The right column blocks are reordered, and "Add to cart" joins the existing "Оформить заявку" button.

- [ ] **Step 1: Add imports and cart hook**

At the top, add:
```tsx
import { useCart } from '@/contexts/CartContext';
import { VOLUME_LABELS } from '@/lib/constants';
```

Inside the component, add:
```tsx
const { addItem, openCart } = useCart();

const getVolumeLabel = () => {
  if (selectedVolume === 'original' && perfume.originalVolumeMl) {
    return `${perfume.originalVolumeMl} мл`;
  }
  return VOLUME_LABELS[selectedVolume];
};
```

- [ ] **Step 2: Replace the right column content with new order**

The right column (`<motion.div>` with `initial={{ opacity: 0, x: 20 }}`...) currently has these blocks in order:
1. Title (brand, name, gender/type/format)
2. Description
3. Notes pyramid
4. Occasion/season
5. Volume selector
6. Price + CTA (desktop)
7. Disclaimer text

Reorder to:
1. Title (brand, name, gender/type/format) — keep first
2. **Volume selector** — move here
3. **Price + CTA** (now includes "Add to cart" button) — move here
4. **Disclaimer** — move here
5. Description
6. Notes pyramid
7. Occasion/season

- [ ] **Step 3: Update the volume selector block**

Replace the volume selector section with (note: `originalVolumeMl` prop added):

```tsx
{/* Volume selector */}
<div className="border-t border-cream-200 pt-8">
  <p className="label text-gold-500 mb-5">Выберите объём</p>
  <VolumeSelector
    availableVolumes={perfume.availableVolumes}
    prices={perfume.prices}
    selected={selectedVolume}
    onChange={setSelectedVolume}
    originalVolumeMl={perfume.originalVolumeMl}
  />
</div>
```

- [ ] **Step 4: Update the Price + CTA block (desktop)**

Replace the existing desktop CTA block with:

```tsx
{/* Price + CTA (desktop) */}
<div className="hidden md:flex border-t border-cream-200 pt-8 flex-col gap-6">
  <div>
    <p className="label text-ink-300 mb-1">Цена</p>
    <motion.p
      key={price}
      className="font-display text-4xl font-light text-ink-900"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {price.toLocaleString('ru-RU')} ₽
    </motion.p>
  </div>
  <div className="flex flex-col sm:flex-row gap-3">
    <button
      onClick={() => {
        addItem({
          perfumeId: perfume.id,
          perfumeName: perfume.name,
          brand: perfume.brand,
          volume: selectedVolume,
          volumeLabel: getVolumeLabel(),
          price,
        });
        openCart();
      }}
      className="btn-primary flex-shrink-0"
    >
      В корзину
    </button>
    <button
      onClick={() => setModalOpen(true)}
      className="btn-outline flex-shrink-0"
    >
      Заказать сразу
    </button>
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-outline flex-shrink-0 inline-flex items-center gap-2"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
      </svg>
      Задать вопрос
    </a>
  </div>
  <p className="text-xs text-ink-300 leading-relaxed">
    Заявка — не оплата. Мы свяжемся с вами для подтверждения заказа через Telegram или по телефону.
  </p>
</div>
```

- [ ] **Step 5: Update mobile CTA bar**

Replace the mobile sticky bar buttons with:

```tsx
<div className="flex items-center justify-between gap-3">
  <div className="min-w-0">
    <motion.p
      key={price}
      className="font-display text-2xl font-light text-ink-900"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {price.toLocaleString('ru-RU')} ₽
    </motion.p>
    <p className="text-xs text-ink-300 truncate">{perfume.name}</p>
  </div>
  <div className="flex gap-2 flex-shrink-0">
    <button
      onClick={() => {
        addItem({
          perfumeId: perfume.id,
          perfumeName: perfume.name,
          brand: perfume.brand,
          volume: selectedVolume,
          volumeLabel: getVolumeLabel(),
          price,
        });
        openCart();
      }}
      className="btn-primary py-3 px-5 text-sm"
    >
      В корзину
    </button>
    <button
      onClick={() => setModalOpen(true)}
      className="btn-outline py-3 px-4 text-sm"
    >
      Заказать
    </button>
  </div>
</div>
```

- [ ] **Step 6: Update OrderModal call — pass volumeLabel**

The `<OrderModal>` at the bottom of the component needs a `volumeLabel` prop:

```tsx
<OrderModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  perfumeName={perfume.name}
  perfumeId={perfume.id}
  brand={perfume.brand}
  volume={selectedVolume}
  volumeLabel={getVolumeLabel()}
  price={price}
/>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ProductPageClient.tsx
git commit -m "feat: reorder product page layout, add cart button, pass volumeLabel to OrderModal"
```

---

## Task 11: Final type-check and build

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/a1/Desktop/проекты/perfume-store && npx tsc --noEmit 2>&1
```

Fix any remaining type errors before proceeding.

- [ ] **Step 2: Run build**

```bash
cd /Users/a1/Desktop/проекты/perfume-store && npm run build 2>&1
```

Expected: successful build with no errors. Fix any errors that appear.

- [ ] **Step 3: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000`. Check:
- Cart icon visible in header with badge when items added
- Product page: volume selector appears before description/notes
- "В корзину" adds item, opens drawer
- "Заказать сразу" opens single-item OrderModal
- CartDrawer shows items, total, "Оформить заявку" → CartCheckoutModal
- Mobile sticky bar has both "В корзину" and "Заказать" buttons

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final type fixes and build verification"
```
