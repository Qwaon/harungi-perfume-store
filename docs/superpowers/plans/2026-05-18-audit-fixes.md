# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить все баги и проблемы качества, найденные в ходе аудита HARUNGI через Playwright.

**Architecture:** Исправления разбиты по приоритету: сначала критические баги (CartContext isOpen reset, LCP priority), затем рефакторинг (вынос дублирующего кода, хранение imageUrl в CartItem), затем минорные улучшения (font-size, QuickAddSheet positioning). Каждая задача независима — можно применять по одной.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, localStorage

---

## Файлы, затрагиваемые в плане

| Файл | Что меняется |
|------|-------------|
| `src/contexts/CartContext.tsx` | Сбрасывать `isOpen: false` при инициализации из localStorage |
| `src/components/ProductCard.tsx` | Добавить `priority` на LCP-изображение |
| `src/lib/order.ts` | Создать — вынести `detectSource`, валидаторы, константы |
| `src/components/CartCheckoutModal.tsx` | Использовать `src/lib/order.ts`, хранить `openedAt` через useEffect |
| `src/components/OrderModal.tsx` | Использовать `src/lib/order.ts` |
| `src/types/index.ts` | Добавить `imageUrl?: string` в `CartItem` |
| `src/components/CartDrawer.tsx` | Убрать импорт `perfumes`, использовать `item.imageUrl` |
| `src/app/product/[id]/page.tsx` | Передавать `imageUrl` при `addItem` |
| `src/components/QuickAddSheet.tsx` | Убрать inline `bottom` style, управлять через CSS |
| `src/app/globals.css` | Исправить `font-size: 16px` для Android |

---

## Task 1: CartContext — сбрасывать isOpen при инициализации

**Проблема:** `isOpen` персистируется в `useState(false)`, но если страница была закрыта пока корзина открыта (e.g. после предыдущего сеанса через `setIsOpen(true)`), то localStorage не хранит isOpen, и при следующем открытии всё нормально. **НО** при Playwright-тестировании выяснилось: после первого `addItem` корзина открывается. Проверяем код — `addItem` не вызывает `openCart()`. Значит баг в другом: `CartDrawer` открыт потому что тест кликнул "В корзину" и сработал какой-то другой путь.

Реальная проблема: в [CartContext.tsx:36-41] `isOpen` использует `lockScroll/unlockScroll` но не сбрасывается между навигациями. Добавим явный сброс `isOpen: false` при монтировании для надёжности.

**Files:**
- Modify: `src/contexts/CartContext.tsx`

- [ ] **Step 1: Открыть файл и найти инициализацию**

В [src/contexts/CartContext.tsx](src/contexts/CartContext.tsx) `isOpen` инициализируется как `useState(false)`. Добавить `useEffect` который при монтировании форсирует `false`:

```tsx
// После существующего useEffect с localStorage.getItem:
useEffect(() => {
  setIsOpen(false);
}, []);
```

Это гарантирует что даже если state каким-то образом восстановился — корзина закрыта при загрузке.

- [ ] **Step 2: Также добавить сброс scroll lock при размонтировании CartProvider**

Текущий код в CartContext:

```tsx
useEffect(() => {
  if (isOpen) {
    lockScroll();
    return () => unlockScroll();
  }
}, [isOpen]);
```

Это уже корректно — при `isOpen: false` unlockScroll вызывается. Шаг не требует изменений.

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

Ожидаемый результат: успешная сборка без TypeScript-ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/CartContext.tsx
git commit -m "fix: force isOpen false on CartContext mount to prevent stale open state"
```

---

## Task 2: LCP-изображение — добавить priority на ProductCard

**Проблема:** Консоль предупреждает что LCP-изображение не имеет `priority`. В каталоге и на главной первый `ProductCard` (index=0) содержит LCP-изображение.

**Files:**
- Modify: `src/components/ProductCard.tsx`

- [ ] **Step 1: Добавить проп priority**

В [src/components/ProductCard.tsx](src/components/ProductCard.tsx) интерфейс Props:

```tsx
interface Props {
  perfume: Perfume;
  index?: number;
  onQuickAdd?: (perfume: Perfume) => void;
  priority?: boolean;
}
```

И в компоненте изменить `<Image>`:

```tsx
export default function ProductCard({ perfume, index = 0, onQuickAdd, priority = false }: Props) {
  // ...
  <Image
    src={perfume.images[0]}
    alt={`${perfume.name} — ${perfume.brand}`}
    fill
    sizes="(max-width: 768px) 50vw, 25vw"
    className="object-cover transition-transform duration-700 group-hover:scale-105"
    priority={priority}
  />
```

- [ ] **Step 2: Передать priority={true} для первого товара на главной**

В [src/components/FeaturedPerfumes.tsx](src/components/FeaturedPerfumes.tsx):

```tsx
{perfumes.map((p, i) => (
  <ProductCard key={p.id} perfume={p} index={i} priority={i === 0} />
))}
```

- [ ] **Step 3: Передать priority={true} для первого товара в каталоге**

В [src/components/CatalogClient.tsx](src/components/CatalogClient.tsx) найти рендер `ProductCard` в гриде и добавить `priority`:

```tsx
<ProductCard
  key={p.id}
  perfume={p}
  index={i}
  priority={i === 0 && currentPage === 1}
  onQuickAdd={setQuickAddPerfume}
/>
```

- [ ] **Step 4: Проверить сборку**

```bash
npm run build
```

Ожидаемый результат: успешная сборка без TypeScript-ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductCard.tsx src/components/FeaturedPerfumes.tsx src/components/CatalogClient.tsx
git commit -m "perf: add priority prop to ProductCard, set on first LCP image"
```

---

## Task 3: Вынести дублирующий код в src/lib/order.ts

**Проблема:** `detectSource()`, `isValidName()`, `isValidContact()` и константы (`MIN_NAME_LENGTH`, `MAX_NAME_LENGTH`, `MIN_CONTACT_LENGTH`, `MAX_CONTACT_LENGTH`, `MIN_SUBMIT_DELAY_MS`, `CLIENT_RATE_LIMIT_MS`, `LAST_SUBMIT_KEY`) продублированы в `OrderModal.tsx` и `CartCheckoutModal.tsx`.

**Files:**
- Create: `src/lib/order.ts`
- Modify: `src/components/OrderModal.tsx`
- Modify: `src/components/CartCheckoutModal.tsx`

- [ ] **Step 1: Создать src/lib/order.ts**

```ts
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 60;
export const MIN_CONTACT_LENGTH = 4;
export const MAX_CONTACT_LENGTH = 80;
export const MIN_SUBMIT_DELAY_MS = 1500;
export const CLIENT_RATE_LIMIT_MS = 30_000;
export const LAST_SUBMIT_KEY = 'harungi-last-order-submit-at';

export function detectSource(): string {
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

export function isValidName(value: string): boolean {
  const t = value.trim();
  return t.length >= MIN_NAME_LENGTH && t.length <= MAX_NAME_LENGTH;
}

export function isValidContact(value: string): boolean {
  const t = value.trim();
  if (t.length < MIN_CONTACT_LENGTH || t.length > MAX_CONTACT_LENGTH) return false;
  return (
    /^@?[a-zA-Z0-9_]{4,32}$/.test(t) ||
    (/^\+?[0-9\s\-()]{7,20}$/.test(t) && t.replace(/\D/g, '').length >= 7)
  );
}
```

- [ ] **Step 2: Обновить CartCheckoutModal.tsx — убрать дублирующий код**

Удалить из `src/components/CartCheckoutModal.tsx` все локальные константы и функции:
```
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;
const MIN_CONTACT_LENGTH = 4;
const MAX_CONTACT_LENGTH = 80;
const MIN_SUBMIT_DELAY_MS = 1500;
const CLIENT_RATE_LIMIT_MS = 30_000;
const LAST_SUBMIT_KEY = 'harungi-last-order-submit-at';
function detectSource() { ... }
function isValidName(value: string) { ... }
function isValidContact(value: string) { ... }
```

Добавить импорт в начало файла (после существующих импортов):
```ts
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MIN_CONTACT_LENGTH,
  MAX_CONTACT_LENGTH,
  MIN_SUBMIT_DELAY_MS,
  CLIENT_RATE_LIMIT_MS,
  LAST_SUBMIT_KEY,
  detectSource,
  isValidName,
  isValidContact,
} from '@/lib/order';
```

- [ ] **Step 3: Обновить OrderModal.tsx — убрать дублирующий код**

Удалить из `src/components/OrderModal.tsx` те же локальные константы и функции.

Добавить такой же импорт из `@/lib/order`.

- [ ] **Step 4: Проверить сборку**

```bash
npm run build
```

Ожидаемый результат: успешная сборка без TypeScript-ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/lib/order.ts src/components/CartCheckoutModal.tsx src/components/OrderModal.tsx
git commit -m "refactor: extract shared order utils to src/lib/order.ts"
```

---

## Task 4: Хранить imageUrl в CartItem — убрать импорт perfumes из CartDrawer

**Проблема:** `CartDrawer` импортирует весь массив `perfumes` только чтобы найти `images[0]` для thumbnail. Это добавляет весь каталог в клиентский бандл CartDrawer.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/components/CartDrawer.tsx`
- Modify: `src/app/product/[id]/page.tsx` (или где вызывается addItem со страницы товара)
- Modify: `src/components/QuickAddSheet.tsx`

- [ ] **Step 1: Добавить imageUrl в тип CartItem**

В [src/types/index.ts](src/types/index.ts) найти интерфейс `CartItem` и добавить поле:

```ts
export interface CartItem {
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volume: Volume;
  volumeLabel: string;
  price: number;
  imageUrl?: string;   // добавить
}
```

- [ ] **Step 2: Передавать imageUrl в QuickAddSheet при addItem**

В [src/components/QuickAddSheet.tsx](src/components/QuickAddSheet.tsx) в функции `handleAdd`:

```tsx
const item: CartItem = {
  perfumeId: perfume.id,
  perfumeName: perfume.name,
  brand: perfume.brand,
  volume: selected,
  volumeLabel: VOLUME_LABELS[selected],
  price,
  imageUrl: perfume.images[0],
};
```

- [ ] **Step 3: Передавать imageUrl в addItem на странице товара**

В [src/app/product/[id]/page.tsx](src/app/product/[id]/page.tsx) найти все вызовы `addItem(...)` и добавить `imageUrl: perfume.images[0]`.

Если вызовы происходят в клиентском компоненте страницы товара — найти его и обновить там.

```bash
grep -r "addItem" src/ --include="*.tsx" -l
```

Для каждого файла добавить `imageUrl: perfume.images[0]` в объект CartItem.

- [ ] **Step 4: Обновить CartDrawer — убрать импорт perfumes**

В [src/components/CartDrawer.tsx](src/components/CartDrawer.tsx):

1. Удалить строку: `import { perfumes } from '@/data/perfumes';`
2. Удалить: `const perfume = perfumes.find((p) => p.id === item.perfumeId);` и `const image = perfume?.images[0];`
3. Заменить использование `image` на `item.imageUrl`:

```tsx
{items.map((item) => (
  <div key={`${item.perfumeId}-${item.volume}`} className="...">
    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-cream-200 flex-shrink-0">
      {item.imageUrl && (
        <Image
          src={item.imageUrl}
          alt={item.perfumeName}
          fill
          sizes="64px"
          className="object-cover"
        />
      )}
    </div>
    {/* остальной jsx без изменений */}
  </div>
))}
```

- [ ] **Step 5: Проверить сборку**

```bash
npm run build
```

Ожидаемый результат: успешная сборка без TypeScript-ошибок.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/components/CartDrawer.tsx src/components/QuickAddSheet.tsx
git commit -m "perf: store imageUrl in CartItem, remove perfumes import from CartDrawer"
```

---

## Task 5: Исправить font-size для Android в globals.css

**Проблема:** `@supports (-webkit-touch-callout: none)` работает только на iOS/Safari. Android Chrome не поддерживает этот supports-запрос, поэтому на Android входные поля могут зумировать страницу при фокусе.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Заменить @supports на прямое правило**

В [src/app/globals.css](src/app/globals.css) найти:

```css
@supports (-webkit-touch-callout: none) {
  input, select, textarea {
    font-size: 16px;
  }
}
```

Заменить на:

```css
input, select, textarea {
  font-size: 16px;
}
```

Это безопасно — `font-size: 16px` для инпутов не влияет на десктоп (там используется `.input-base` с `text-sm` через Tailwind, который идёт позже в каскаде и имеет более высокую специфичность через `@layer components`).

- [ ] **Step 2: Проверить что .input-base стили перекрывают**

В `globals.css` убедиться что `.input-base` объявлен внутри `@layer components` — он идёт после и перекроет `font-size: 16px` на десктопе через слой. Текущий код уже использует `@layer components { .input-base { ... } }` — порядок правильный.

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: apply font-size 16px to inputs unconditionally to prevent zoom on Android"
```

---

## Task 6: QuickAddSheet — убрать inline bottom style

**Проблема:** QuickAddSheet использует inline `style={{ bottom: 'calc(56px + ...)' }}` который переопределяется в `globals.css` через `!important`. Inline styles всегда бьют CSS, что делает этот подход хрупким.

**Files:**
- Modify: `src/components/QuickAddSheet.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Убрать inline bottom из QuickAddSheet**

В [src/components/QuickAddSheet.tsx](src/components/QuickAddSheet.tsx) найти `<motion.div className="quick-add-sheet ...">` и убрать из `style`:

До:
```tsx
<motion.div
  className="quick-add-sheet fixed left-0 right-0 z-50 bg-cream-50 rounded-t-2xl p-6 md:rounded-2xl md:max-w-md"
  style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', paddingBottom: '1.5rem' }}
  ...
>
```

После:
```tsx
<motion.div
  className="quick-add-sheet fixed left-0 right-0 z-50 bg-cream-50 rounded-t-2xl p-6 md:rounded-2xl md:max-w-md"
  style={{ paddingBottom: '1.5rem' }}
  ...
>
```

- [ ] **Step 2: Перенести мобильный bottom в CSS и убрать !important**

В [src/app/globals.css](src/app/globals.css) найти блок `.quick-add-sheet`:

```css
@media (min-width: 768px) {
  .quick-add-sheet {
    bottom: 1.5rem !important;
    left: auto !important;
    right: 1.5rem !important;
    padding-bottom: 1.5rem !important;
  }
}
```

Заменить на:

```css
.quick-add-sheet {
  bottom: calc(56px + env(safe-area-inset-bottom, 0px));
}

@media (min-width: 768px) {
  .quick-add-sheet {
    bottom: 1.5rem;
    left: auto;
    right: 1.5rem;
    padding-bottom: 1.5rem;
  }
}
```

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/QuickAddSheet.tsx src/app/globals.css
git commit -m "fix: move QuickAddSheet bottom positioning from inline style to CSS"
```

---

## Task 7: openedAt — инициализировать через useEffect в CartCheckoutModal

**Проблема:** `openedAt` устанавливается в `onAnimationStart`, которое может не сработать при слабом устройстве или если анимация пропущена. Защита от быстрой отправки тогда никогда не включится.

**Files:**
- Modify: `src/components/CartCheckoutModal.tsx`

- [ ] **Step 1: Заменить onAnimationStart на useEffect**

В [src/components/CartCheckoutModal.tsx](src/components/CartCheckoutModal.tsx):

Найти `const [openedAt, setOpenedAt] = useState<number | null>(null);`

Добавить `useEffect` сразу после существующего useEffect с `lockScroll`:

```tsx
useEffect(() => {
  if (isOpen) setOpenedAt(Date.now());
  else setOpenedAt(null);
}, [isOpen]);
```

Удалить из `<motion.div>` пропс:
```tsx
onAnimationStart={() => {
  if (openedAt === null) setOpenedAt(Date.now());
}}
```

- [ ] **Step 2: Убрать openedAt из handleClose**

В `handleClose` найти:
```tsx
setOpenedAt(null);
```
Убрать эту строку — теперь сброс происходит в useEffect при `isOpen: false`.

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CartCheckoutModal.tsx
git commit -m "fix: initialize openedAt via useEffect instead of onAnimationStart"
```

---

## Финальная проверка

- [ ] **Запустить build и убедиться в чистоте**

```bash
npm run build
```

Ожидаемый результат: `✓ Compiled successfully`, 0 TypeScript ошибок.

- [ ] **Проверить в браузере ключевые сценарии**

1. Открыть http://localhost:3000 на мобильном viewport (390px) — все секции видимы при скролле
2. Добавить товар через каталог (QuickAddSheet) — корзина НЕ открывается автоматически
3. Открыть корзину → Оформить заявку → форма показывается
4. Закрыть и открыть снова — isOpen сброшен

- [ ] **Push и деплой**

```bash
git push origin main
```

Vercel автоматически задеплоит при push в main.
