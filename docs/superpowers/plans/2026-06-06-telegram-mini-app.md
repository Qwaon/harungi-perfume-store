# Telegram Mini App + раздел «Аккаунт» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить мобильный сайт HARUNGI в Telegram Mini App и добавить раздел «Аккаунт» (профиль, история заказов, избранное), хранящийся в Telegram CloudStorage — без своего бэкенда.

**Architecture:** Тонкая обёртка поверх существующего Next.js 14 (App Router, SSG). Новый клиентский слой: `TelegramContext` (профиль + флаг `isTelegram`), асинхронный адаптер хранилища `lib/storage.ts` (CloudStorage внутри Telegram, иначе localStorage), `lib/orderHistory.ts` (компактная история, кап 50). Раздел `/account` и 4-я вкладка `BottomNav` видны только внутри Telegram. Worker-webhook и каталог не меняются.

**Tech Stack:** Next.js 14.2.35, TypeScript, Tailwind, Framer Motion, Telegram WebApp SDK (`telegram-web-app.js`).

**Проверка:** В проекте **нет тестового фреймворка** (CLAUDE.md). Каждая задача проверяется через `npm run build` (TypeScript + сборка) и, где указано, ручной проверкой. Не добавлять тест-раннер.

**Спека:** `docs/superpowers/specs/2026-06-06-telegram-mini-app-design.md`

---

## Карта файлов

**Создаются:**
- `src/types/telegram.d.ts` — типы Telegram WebApp SDK (минимальный набор)
- `src/lib/storage.ts` — адаптер CloudStorage | localStorage
- `src/lib/orderHistory.ts` — `appendOrder` / `readOrders`, формат `StoredOrder`, кап 50
- `src/contexts/TelegramContext.tsx` — провайдер профиля + `isTelegram`
- `src/contexts/FavoritesContext.tsx` — провайдер избранного (через `lib/storage`)
- `src/components/TelegramProvider.tsx` — `<Script>` SDK + рендер `TelegramContext`
- `src/app/account/page.tsx` — раздел «Аккаунт»
- `src/components/account/AccountProfile.tsx`
- `src/components/account/OrderHistory.tsx`
- `src/components/account/FavoritesGrid.tsx`
- `src/components/account/SupportLinks.tsx`

**Изменяются:**
- `src/app/layout.tsx` — обернуть в `TelegramProvider` + `FavoritesProvider`
- `src/contexts/CartContext.tsx` — чтение/запись через `lib/storage` (async)
- `src/components/BottomNav.tsx` — 4-я вкладка «Аккаунт» только в Telegram
- `src/components/ProductCard.tsx` — кнопка-тогл «избранное»
- `src/components/ProductPageClient.tsx` — кнопка-тогл «избранное»
- `src/components/OrderModal.tsx` — `appendOrder` после success
- `src/components/CartCheckoutModal.tsx` — `appendOrder` после success

**Удаляется (заменяется контекстом):**
- `src/hooks/useFavorites.ts` — логика переезжает в `FavoritesContext`

---

## Task 1: Типы Telegram WebApp SDK

**Files:**
- Create: `src/types/telegram.d.ts`

- [ ] **Step 1: Создать файл типов**

```ts
// src/types/telegram.d.ts
// Минимальный набор типов Telegram WebApp SDK, используемых проектом.
// Полная спецификация: https://core.telegram.org/bots/webapps

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface TelegramCloudStorage {
  setItem(key: string, value: string, cb?: (err: string | null, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: string | null, value?: string) => void): void;
  removeItem(key: string, cb?: (err: string | null, ok?: boolean) => void): void;
  getKeys(cb: (err: string | null, keys?: string[]) => void): void;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  version: string;
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  setHeaderColor(color: string): void;
  CloudStorage: TelegramCloudStorage;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export {};
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: PASS (TypeScript компилируется, новый `.d.ts` подхватывается)

- [ ] **Step 3: Commit**

```bash
git add src/types/telegram.d.ts
git commit -m "feat(tma): add Telegram WebApp SDK types"
```

---

## Task 2: Адаптер хранилища `lib/storage.ts`

**Files:**
- Create: `src/lib/storage.ts`

Адаптер выбирает бэкенд синхронно по `window.Telegram?.WebApp` (без React-контекста — избегаем гонок). CloudStorage используется только если клиент ≥ 6.9; иначе localStorage. Все методы возвращают Promise.

- [ ] **Step 1: Создать файл**

```ts
// src/lib/storage.ts
'use client';

/**
 * Асинхронный адаптер хранилища.
 * Внутри Telegram (клиент >= 6.9) использует CloudStorage, иначе localStorage.
 * Выбор бэкенда — синхронный, по window.Telegram?.WebApp, чтобы не зависеть
 * от готовности React-контекста и не ловить гонки гидратации.
 */

function getCloudStorage() {
  if (typeof window === 'undefined') return null;
  const wa = window.Telegram?.WebApp;
  if (wa && typeof wa.isVersionAtLeast === 'function' && wa.isVersionAtLeast('6.9')) {
    return wa.CloudStorage;
  }
  return null;
}

export function storageGet(key: string): Promise<string | null> {
  const cs = getCloudStorage();
  if (cs) {
    return new Promise((resolve) => {
      cs.getItem(key, (err, value) => {
        if (err) resolve(null);
        else resolve(value ?? null);
      });
    });
  }
  try {
    return Promise.resolve(localStorage.getItem(key));
  } catch {
    return Promise.resolve(null);
  }
}

export function storageSet(key: string, value: string): Promise<void> {
  const cs = getCloudStorage();
  if (cs) {
    return new Promise((resolve) => {
      cs.setItem(key, value, () => resolve());
    });
  }
  try {
    localStorage.setItem(key, value);
  } catch {}
  return Promise.resolve();
}

export function storageRemove(key: string): Promise<void> {
  const cs = getCloudStorage();
  if (cs) {
    return new Promise((resolve) => {
      cs.removeItem(key, () => resolve());
    });
  }
  try {
    localStorage.removeItem(key);
  } catch {}
  return Promise.resolve();
}

/** true, если работаем поверх Telegram CloudStorage (а не localStorage). */
export function isCloudStorage(): boolean {
  return getCloudStorage() !== null;
}
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat(tma): add async storage adapter (CloudStorage | localStorage)"
```

---

## Task 3: История заказов `lib/orderHistory.ts`

**Files:**
- Create: `src/lib/orderHistory.ts`

Компактный формат, кап 50. `appendOrder` не должен бросать наружу (оборачивается в try/catch). Зависит от `Volume` из `@/types` и `storageGet/storageSet` из Task 2.

- [ ] **Step 1: Создать файл**

```ts
// src/lib/orderHistory.ts
'use client';

import { Volume } from '@/types';
import { storageGet, storageSet } from '@/lib/storage';

const ORDERS_KEY = 'orders';
const MAX_ORDERS = 50;

/** Позиция: [perfumeId, volume, quantity, unitPrice] — компактно под лимит 4 КБ. */
export type StoredOrderItem = [string, Volume, number, number];

export interface StoredOrder {
  id: string;
  ts: string; // ISO дата
  items: StoredOrderItem[];
  total: number;
  type: 'order' | 'cart-order';
}

function isStoredOrder(x: unknown): x is StoredOrder {
  return (
    !!x &&
    typeof (x as StoredOrder).id === 'string' &&
    typeof (x as StoredOrder).ts === 'string' &&
    Array.isArray((x as StoredOrder).items) &&
    typeof (x as StoredOrder).total === 'number'
  );
}

export async function readOrders(): Promise<StoredOrder[]> {
  try {
    const raw = await storageGet(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredOrder);
  } catch {
    return [];
  }
}

/** Добавляет заказ в начало истории, обрезает до MAX_ORDERS. Никогда не бросает. */
export async function appendOrder(order: Omit<StoredOrder, 'id' | 'ts'>): Promise<void> {
  try {
    const existing = await readOrders();
    const entry: StoredOrder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      ...order,
    };
    const next = [entry, ...existing].slice(0, MAX_ORDERS);
    await storageSet(ORDERS_KEY, JSON.stringify(next));
  } catch {
    // история не критична — оформление заказа уже прошло
  }
}
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/orderHistory.ts
git commit -m "feat(tma): add order history helpers (CloudStorage, cap 50)"
```

---

## Task 4: `TelegramContext` + `TelegramProvider`

**Files:**
- Create: `src/contexts/TelegramContext.tsx`
- Create: `src/components/TelegramProvider.tsx`

`isTelegram` имеет тип `boolean | undefined` (undefined = ещё не определились → скелетоны на `/account`).

- [ ] **Step 1: Создать контекст**

```tsx
// src/contexts/TelegramContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { TelegramUser } from '@/types/telegram';

interface TelegramContextValue {
  isTelegram: boolean | undefined; // undefined = ещё не определились
  user: TelegramUser | null;
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: undefined,
  user: null,
});

export function TelegramContextProvider({ children }: { children: ReactNode }) {
  const [isTelegram, setIsTelegram] = useState<boolean | undefined>(undefined);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const wa = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
    const inTelegram = !!wa && typeof wa.initData === 'string' && wa.initData.length > 0;
    setIsTelegram(inTelegram);
    if (inTelegram && wa) {
      try {
        wa.ready();
        wa.expand();
        // палитра HARUNGI остаётся; красим только шапку под cream-фон
        wa.setHeaderColor('#f5f4ed');
      } catch {}
      setUser(wa.initDataUnsafe?.user ?? null);
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ isTelegram, user }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
```

- [ ] **Step 2: Создать провайдер со скриптом SDK**

```tsx
// src/components/TelegramProvider.tsx
'use client';

import Script from 'next/script';
import { ReactNode } from 'react';
import { TelegramContextProvider } from '@/contexts/TelegramContext';

export default function TelegramProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <TelegramContextProvider>{children}</TelegramContextProvider>
    </>
  );
}
```

- [ ] **Step 3: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/contexts/TelegramContext.tsx src/components/TelegramProvider.tsx
git commit -m "feat(tma): add TelegramProvider + context (profile, isTelegram)"
```

---

## Task 5: `FavoritesContext` (заменяет `useFavorites`)

**Files:**
- Create: `src/contexts/FavoritesContext.tsx`
- Delete: `src/hooks/useFavorites.ts`

Хранилище — через `lib/storage`, ключ `favorites`. Одноразовая миграция из старого localStorage-ключа `parfum_favorites`.

- [ ] **Step 1: Создать контекст**

```tsx
// src/contexts/FavoritesContext.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { storageGet, storageSet, isCloudStorage } from '@/lib/storage';

const KEY = 'favorites';
const LEGACY_KEY = 'parfum_favorites';
const MIGRATED_FLAG = 'harungi-fav-migrated';

interface FavoritesContextValue {
  favorites: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
  hydrated: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipNextPersist = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        // одноразовая миграция из localStorage в CloudStorage
        if (isCloudStorage() && !localStorage.getItem(MIGRATED_FLAG)) {
          const legacy = localStorage.getItem(LEGACY_KEY);
          const current = await storageGet(KEY);
          if (legacy && !current) await storageSet(KEY, legacy);
          localStorage.setItem(MIGRATED_FLAG, '1');
        }
        const raw = (await storageGet(KEY)) ?? localStorage.getItem(LEGACY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFavorites(parsed.filter((x) => typeof x === 'string'));
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    storageSet(KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggle = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const isFavorite = (id: string) => favorites.includes(id);

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFavorite, hydrated }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
```

- [ ] **Step 2: Удалить старый хук**

```bash
git rm src/hooks/useFavorites.ts
```

- [ ] **Step 3: Проверка сборки**

Run: `npm run build`
Expected: PASS (старый хук был dead code — ничего не ломается)

- [ ] **Step 4: Commit**

```bash
git add src/contexts/FavoritesContext.tsx
git commit -m "feat(tma): add FavoritesProvider with storage adapter, drop dead useFavorites hook"
```

---

## Task 6: Подключить провайдеры в `layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

Обернуть дерево: `MotionProvider > TelegramProvider > CartProvider > FavoritesProvider`.

- [ ] **Step 1: Добавить импорты**

В `src/app/layout.tsx` после строки `import MotionProvider from '@/components/MotionProvider';` добавить:

```tsx
import TelegramProvider from '@/components/TelegramProvider';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
```

- [ ] **Step 2: Обернуть дерево**

Заменить блок:

```tsx
        <MotionProvider>
          <CartProvider>
```

на:

```tsx
        <MotionProvider>
          <TelegramProvider>
          <CartProvider>
          <FavoritesProvider>
```

И заменить закрывающий блок:

```tsx
          </CartProvider>
        </MotionProvider>
```

на:

```tsx
          </FavoritesProvider>
          </CartProvider>
          </TelegramProvider>
        </MotionProvider>
```

- [ ] **Step 3: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Ручная проверка (вне Telegram)**

Run: `npm run dev`, открыть `http://localhost:3000` — сайт работает как раньше (вкладок «Аккаунт» пока нет, добавим в Task 9).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(tma): wire TelegramProvider + FavoritesProvider in layout"
```

---

## Task 7: `CartContext` на адаптер хранилища

**Files:**
- Modify: `src/contexts/CartContext.tsx`

Чтение/запись переводятся на `lib/storage` (async). Ключ внутри Telegram — `cart`, вне — старый `harungi-cart`. Одноразовая миграция. `skipNextPersist` сохраняется.

- [ ] **Step 1: Добавить импорт адаптера**

После строки `import { lockScroll, unlockScroll } from '@/lib/scrollLock';` добавить:

```tsx
import { storageGet, storageSet, isCloudStorage } from '@/lib/storage';
```

- [ ] **Step 2: Добавить константы ключей**

После строки `const MAX_QUANTITY = 99;` добавить:

```tsx
const CART_KEY = 'cart';
const LEGACY_CART_KEY = 'harungi-cart';
const CART_MIGRATED_FLAG = 'harungi-cart-migrated';
```

- [ ] **Step 3: Заменить эффект загрузки**

Заменить:

```tsx
  useEffect(() => {
    try {
      const saved = localStorage.getItem('harungi-cart');
      if (saved) setItems(sanitizeStoredItems(JSON.parse(saved)));
    } catch {}
    setIsOpen(false);
  }, []);
```

на:

```tsx
  useEffect(() => {
    (async () => {
      try {
        // одноразовая миграция localStorage -> CloudStorage
        if (isCloudStorage() && !localStorage.getItem(CART_MIGRATED_FLAG)) {
          const legacy = localStorage.getItem(LEGACY_CART_KEY);
          const current = await storageGet(CART_KEY);
          if (legacy && !current) await storageSet(CART_KEY, legacy);
          localStorage.setItem(CART_MIGRATED_FLAG, '1');
        }
        const saved = (await storageGet(CART_KEY)) ?? localStorage.getItem(LEGACY_CART_KEY);
        if (saved) setItems(sanitizeStoredItems(JSON.parse(saved)));
      } catch {}
    })();
    setIsOpen(false);
  }, []);
```

- [ ] **Step 4: Заменить эффект сохранения**

Заменить:

```tsx
  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    localStorage.setItem('harungi-cart', JSON.stringify(items));
  }, [items]);
```

на:

```tsx
  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    storageSet(CART_KEY, JSON.stringify(items));
  }, [items]);
```

- [ ] **Step 5: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Ручная проверка персистенции (prod-сборка!)**

CLAUDE.md: персистенцию проверять на prod-сборке, не dev (StrictMode маскирует баги).

Run: `npm run build && npm run start` → открыть `http://localhost:3000`, добавить товар в корзину, перезагрузить страницу.
Expected: корзина сохранилась (вне Telegram использует `cart` через localStorage-ветку адаптера).

- [ ] **Step 7: Commit**

```bash
git add src/contexts/CartContext.tsx
git commit -m "feat(tma): persist cart via storage adapter with localStorage migration"
```

---

## Task 8: Запись истории заказов в модалках

**Files:**
- Modify: `src/components/OrderModal.tsx`
- Modify: `src/components/CartCheckoutModal.tsx`

После успешной отправки заявки писать заказ в историю — только внутри Telegram. `appendOrder` не бросает.

- [ ] **Step 1: OrderModal — импорты**

В `src/components/OrderModal.tsx` после строки `import { trackEvent } from '@/lib/analytics';` добавить:

```tsx
import { appendOrder } from '@/lib/orderHistory';
import { useTelegram } from '@/contexts/TelegramContext';
```

- [ ] **Step 2: OrderModal — получить isTelegram**

Внутри компонента после строки `const [openedAt, setOpenedAt] = useState<number | null>(null);` добавить:

```tsx
  const { isTelegram } = useTelegram();
```

- [ ] **Step 3: OrderModal — писать в историю при успехе**

В `handleSubmit`, в ветке `if (sent) { ... }`, после `trackEvent('order_submit', { perfumeId, volume, price });` добавить:

```tsx
        if (isTelegram) {
          appendOrder({ items: [[perfumeId, volume, 1, price]], total: price, type: 'order' });
        }
```

И в ветке `else` (fallback), после `trackEvent('order_fallback', { perfumeId, volume });` добавить ту же запись:

```tsx
        if (isTelegram) {
          appendOrder({ items: [[perfumeId, volume, 1, price]], total: price, type: 'order' });
        }
```

- [ ] **Step 4: CartCheckoutModal — импорты**

В `src/components/CartCheckoutModal.tsx` после строки `import { pluralizeRu, POSITION_FORMS } from '@/lib/plural';` добавить:

```tsx
import { appendOrder } from '@/lib/orderHistory';
import { useTelegram } from '@/contexts/TelegramContext';
```

- [ ] **Step 5: CartCheckoutModal — получить isTelegram**

После строки `const [openedAt, setOpenedAt] = useState<number | null>(null);` добавить:

```tsx
  const { isTelegram } = useTelegram();
```

- [ ] **Step 6: CartCheckoutModal — писать в историю при успехе**

В `handleSubmit`: в ветке `if (sent) { ... }` после `trackEvent('order_submit', { itemCount: items.length, total });` и в ветке `else` после `trackEvent('order_fallback', { itemCount: items.length });` добавить (в обе ветки):

```tsx
        if (isTelegram) {
          appendOrder({
            items: items.map((i) => [i.perfumeId, i.volume, i.quantity, i.price]),
            total,
            type: 'cart-order',
          });
        }
```

- [ ] **Step 7: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/OrderModal.tsx src/components/CartCheckoutModal.tsx
git commit -m "feat(tma): record orders to history on success (Telegram only)"
```

---

## Task 9: 4-я вкладка «Аккаунт» в `BottomNav`

**Files:**
- Modify: `src/components/BottomNav.tsx`

Вкладка показывается только при `isTelegram === true`.

- [ ] **Step 1: Импорты + хук**

В `src/components/BottomNav.tsx` после `import { useCart } from '@/contexts/CartContext';` добавить:

```tsx
import { useTelegram } from '@/contexts/TelegramContext';
```

Внутри компонента после `const { count, openCart } = useCart();` добавить:

```tsx
  const { isTelegram } = useTelegram();
```

- [ ] **Step 2: Добавить вкладку после кнопки «Корзина»**

Перед закрывающим `</nav>` (после блока кнопки корзины) добавить:

```tsx
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
```

- [ ] **Step 3: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "feat(tma): add Account tab to BottomNav (Telegram only)"
```

---

## Task 10: Кнопка «избранное» на карточке и странице товара

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/ProductPageClient.tsx`

Сердце-тогл, 44px, `aria-label`. Использует `FavoritesContext`.

- [ ] **Step 1: ProductCard — импорт**

В `src/components/ProductCard.tsx` после `import { Perfume } from '@/types';` добавить:

```tsx
import { useFavorites } from '@/contexts/FavoritesContext';
```

- [ ] **Step 2: ProductCard — хук**

После `const minPrice = Math.min(...Object.values(perfume.prices));` добавить:

```tsx
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(perfume.id);
```

- [ ] **Step 3: ProductCard — кнопка-сердце поверх картинки**

Внутри `<Link href={`/product/${perfume.id}`} className="block relative ...">`, сразу после `<div className="absolute inset-0 bg-ink-900/0 ...">` (перед блоком Badges), добавить:

```tsx
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggle(perfume.id); }}
            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full bg-cream-50/80 backdrop-blur-sm hover:bg-cream-50 transition-colors"
            aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={fav}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? '#5c6b3f' : 'none'} stroke="#5c6b3f" strokeWidth="1.8">
              <path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.6 5.5 5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.4 0 4.4 3.5 3 6.3C19.5 16.4 12 21 12 21Z" strokeLinejoin="round" />
            </svg>
          </button>
```

- [ ] **Step 5: ProductPageClient — импорт + хук**

Проп страницы — `perfume` ([ProductPageClient.tsx:20](src/components/ProductPageClient.tsx#L20)). Название товара рендерится в `<h1>` со `{perfume.name}` около строки 103.

Добавить импорт `import { useFavorites } from '@/contexts/FavoritesContext';` рядом с другими импортами. Внутри компонента после `const price = perfume.prices[selectedVolume] ?? 0;` добавить:

```tsx
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(perfume.id);
```

- [ ] **Step 6: ProductPageClient — кнопка рядом с заголовком**

Обернуть заголовок `<h1>...{perfume.name}</h1>` (около строки 103) в флекс-контейнер с кнопкой справа, например:

```tsx
                <div className="flex items-start justify-between gap-3">
                  <h1 className="font-display ...">{perfume.name}</h1>
                  {/* кнопка ниже */}
                </div>
```

(Сохранить существующие классы `<h1>`.) Кнопка (тот же SVG-сердце, 44px):

```tsx
          <button
            type="button"
            onClick={() => toggle(perfume.id)}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-cream-200 transition-colors flex-shrink-0"
            aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={fav}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={fav ? '#5c6b3f' : 'none'} stroke="#5c6b3f" strokeWidth="1.8">
              <path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.6 5.5 5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.4 0 4.4 3.5 3 6.3C19.5 16.4 12 21 12 21Z" strokeLinejoin="round" />
            </svg>
          </button>
```

- [ ] **Step 7: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 8: Ручная проверка**

Run: `npm run dev` — на карточке каталога видно сердце, тап переключает заливку; на странице товара тоже. (Вне Telegram избранное живёт в localStorage.)

- [ ] **Step 9: Commit**

```bash
git add src/components/ProductCard.tsx src/components/ProductPageClient.tsx
git commit -m "feat(tma): add favorite toggle to ProductCard and product page"
```

---

## Task 11: Компоненты раздела «Аккаунт»

**Files:**
- Create: `src/components/account/AccountProfile.tsx`
- Create: `src/components/account/OrderHistory.tsx`
- Create: `src/components/account/FavoritesGrid.tsx`
- Create: `src/components/account/SupportLinks.tsx`

- [ ] **Step 1: AccountProfile**

```tsx
// src/components/account/AccountProfile.tsx
'use client';

import Image from 'next/image';
import type { TelegramUser } from '@/types/telegram';

export default function AccountProfile({ user }: { user: TelegramUser | null }) {
  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Гость';
  const initial = (user?.first_name?.[0] ?? 'Г').toUpperCase();

  return (
    <div className="flex items-center gap-4 mb-8">
      {user?.photo_url ? (
        <Image
          src={user.photo_url}
          alt={name}
          width={64}
          height={64}
          className="w-16 h-16 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gold-500 text-cream-50 flex items-center justify-center font-display text-2xl">
          {initial}
        </div>
      )}
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">{name}</h1>
        {user?.username && <p className="text-sm text-ink-300">@{user.username}</p>}
      </div>
    </div>
  );
}
```

Примечание: `user.photo_url` — внешний домен Telegram, поэтому `unoptimized` (без правки `next.config.mjs`).

- [ ] **Step 2: OrderHistory**

```tsx
// src/components/account/OrderHistory.tsx
'use client';

import { useEffect, useState } from 'react';
import { readOrders, StoredOrder } from '@/lib/orderHistory';
import { perfumes } from '@/data/perfumes';
import { VOLUME_LABELS } from '@/lib/constants';
import { pluralizeRu, POSITION_FORMS } from '@/lib/plural';

function nameFor(perfumeId: string): { name: string; brand: string } {
  const p = perfumes.find((x) => x.id === perfumeId);
  return p ? { name: p.name, brand: p.brand } : { name: 'Аромат', brand: '' };
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<StoredOrder[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    readOrders().then(setOrders);
  }, []);

  if (orders === null) {
    return (
      <div className="flex flex-col gap-2 mb-10">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-cream-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mb-10">
        <p className="label text-ink-500 mb-3">История заказов</p>
        <div className="rounded-xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-300"
          style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          Здесь появятся ваши заказы
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <p className="label text-ink-500 mb-3">История заказов</p>
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const open = openId === o.id;
          const count = o.items.reduce((s, it) => s + it[2], 0);
          return (
            <div key={o.id} className="rounded-xl bg-cream-100"
              style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
              <button
                onClick={() => setOpenId(open ? null : o.id)}
                className="w-full flex justify-between items-center px-4 py-3 text-left"
                aria-expanded={open}
              >
                <div>
                  <p className="text-sm text-ink-900">
                    {new Date(o.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-ink-300">{count} {pluralizeRu(count, POSITION_FORMS)}</p>
                </div>
                <p className="font-display text-lg font-light text-ink-900 tabular-nums">
                  {o.total.toLocaleString('ru-RU')} ₽
                </p>
              </button>
              {open && (
                <div className="px-4 pb-3 flex flex-col gap-1 border-t border-cream-200 pt-2">
                  {o.items.map((it, idx) => {
                    const { name, brand } = nameFor(it[0]);
                    return (
                      <div key={idx} className="flex justify-between text-xs text-ink-500">
                        <span>{brand ? `${brand} — ` : ''}{name} · {VOLUME_LABELS[it[1]] ?? it[1]}{it[2] > 1 ? ` ×${it[2]}` : ''}</span>
                        <span className="tabular-nums">{(it[2] * it[3]).toLocaleString('ru-RU')} ₽</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Примечание: `VOLUME_LABELS: Record<Volume, string>` ([constants.ts](src/lib/constants.ts)) — `VOLUME_LABELS[it[1]]` валиден типобезопасно (фолбэк `?? it[1]` оставлен на всякий случай).

- [ ] **Step 3: FavoritesGrid**

```tsx
// src/components/account/FavoritesGrid.tsx
'use client';

import { useFavorites } from '@/contexts/FavoritesContext';
import { perfumes } from '@/data/perfumes';
import ProductCard from '@/components/ProductCard';

export default function FavoritesGrid() {
  const { favorites, hydrated } = useFavorites();

  if (!hydrated) {
    return (
      <div className="mb-10">
        <p className="label text-ink-500 mb-3">Избранное</p>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => <div key={i} className="aspect-[3/4] rounded-xl bg-cream-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const items = perfumes.filter((p) => favorites.includes(p.id));

  return (
    <div className="mb-10">
      <p className="label text-ink-500 mb-3">Избранное</p>
      {items.length === 0 ? (
        <div className="rounded-xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-300"
          style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          Сохраняйте ароматы, нажимая ♥
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((p, i) => <ProductCard key={p.id} perfume={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: SupportLinks**

```tsx
// src/components/account/SupportLinks.tsx
'use client';

import Link from 'next/link';
import { TELEGRAM_URL } from '@/lib/constants';

export default function SupportLinks() {
  const row = 'flex justify-between items-center px-4 py-3.5 rounded-xl bg-cream-100 text-sm text-ink-900';
  const shadow = { boxShadow: '0px 0px 0px 1px #e8e6dc' } as const;
  return (
    <div className="mb-10">
      <p className="label text-ink-500 mb-3">Поддержка</p>
      <div className="flex flex-col gap-2">
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={row} style={shadow}>
          <span>Связаться с менеджером</span><span className="text-ink-300">→</span>
        </a>
        <Link href="/faq" className={row} style={shadow}>
          <span>Вопросы и ответы</span><span className="text-ink-300">→</span>
        </Link>
        <Link href="/how-it-works" className={row} style={shadow}>
          <span>Как заказать и доставка</span><span className="text-ink-300">→</span>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/account/
git commit -m "feat(tma): add account section components (profile, history, favorites, support)"
```

---

## Task 12: Страница `/account`

**Files:**
- Create: `src/app/account/page.tsx`

Внутри Telegram — раздел. Вне Telegram — заглушка. До определения `isTelegram` — скелетон.

- [ ] **Step 1: Создать страницу**

```tsx
// src/app/account/page.tsx
'use client';

import { useTelegram } from '@/contexts/TelegramContext';
import AccountProfile from '@/components/account/AccountProfile';
import OrderHistory from '@/components/account/OrderHistory';
import FavoritesGrid from '@/components/account/FavoritesGrid';
import SupportLinks from '@/components/account/SupportLinks';
import { TELEGRAM_URL } from '@/lib/constants';

export default function AccountPage() {
  const { isTelegram, user } = useTelegram();

  if (isTelegram === undefined) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-16 w-48 rounded-xl bg-cream-200 animate-pulse mb-8" />
        <div className="h-40 rounded-xl bg-cream-200 animate-pulse" />
      </div>
    );
  }

  if (!isTelegram) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-light text-ink-900 mb-3">Аккаунт</h1>
        <p className="text-ink-500 text-sm mb-8">
          Раздел доступен в нашем Telegram-приложении.
        </p>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-primary inline-block">
          Открыть в Telegram
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <AccountProfile user={user} />
      <OrderHistory />
      <FavoritesGrid />
      <SupportLinks />
    </div>
  );
}
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Ручная проверка (вне Telegram)**

Run: `npm run dev` → `http://localhost:3000/account` показывает заглушку «Доступно в Telegram».

- [ ] **Step 4: Commit**

```bash
git add src/app/account/page.tsx
git commit -m "feat(tma): add /account page (Telegram section + browser fallback)"
```

---

## Task 13: Финальная проверка и обновление документации

**Files:**
- Modify: `CLAUDE.md` (короткий раздел про Mini App)

- [ ] **Step 1: Полная сборка**

Run: `npm run build && npm run lint`
Expected: сборка и линт проходят без ошибок.

- [ ] **Step 2: Проверка персистенции на prod**

Run: `npm run start` (после build) → корзина и избранное сохраняются между перезагрузками.

- [ ] **Step 3: Дописать CLAUDE.md**

Добавить в `CLAUDE.md` раздел:

```markdown
## Telegram Mini App

Сайт работает и как обычный сайт, и как Telegram Mini App (один кодовый базис).
- `TelegramProvider`/`TelegramContext` — определяют запуск внутри Telegram (`isTelegram`) и профиль (`initDataUnsafe.user`). SDK грузится через `<Script telegram-web-app.js>`.
- `lib/storage.ts` — единый async-адаптер: внутри Telegram (клиент ≥ 6.9) пишет в CloudStorage, иначе в localStorage. Ключи: `cart`, `favorites`, `orders`.
- Раздел `/account` и 4-я вкладка BottomNav видны только внутри Telegram. История заказов (`lib/orderHistory.ts`, кап 50) пишется после успешной заявки в `OrderModal`/`CartCheckoutModal`.
- Worker-webhook и каталог не затронуты. Привязка бота к URL — в @BotFather (`/newapp`), вне кода. Токен бота во фронтенде не используется.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Telegram Mini App architecture in CLAUDE.md"
```

---

## Self-Review notes

- **Покрытие спеки:** TelegramContext (T4), storage adapter + миграция (T2,T5,T7), orderHistory кап 50 (T3,T8), раздел Аккаунт: профиль/история/избранное/поддержка (T11,T12), 4-я вкладка (T9), кнопка избранного (T10), скелетоны/edge-кейсы (T11,T12), своя палитра + setHeaderColor (T4), безопасность токена (не используется в коде, отмечено в T13). ✓
- **Типы согласованы:** `StoredOrder`/`StoredOrderItem` (T3) совпадают с использованием в T8/T11; `useFavorites` API `{favorites, toggle, isFavorite, hydrated}` (T5) совпадает с T10/T11; `useTelegram` `{isTelegram, user}` (T4) — с T8/T9/T12.
- **Проверено до старта:** проп `perfume` в `ProductPageClient` (строка 20, заголовок ~103) и `VOLUME_LABELS: Record<Volume, string>` в `constants.ts` — план зафиксирован под фактический код.
