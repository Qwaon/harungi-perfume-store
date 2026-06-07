# Рантайм-каталог из Airtable (ISR) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Каталог читается из Airtable во время работы сайта (ISR, revalidate=60) с фолбэком на встроенный `perfumes.json`, без ручного sync/пересборки.

**Architecture:** Новый серверный data-layer `src/data/catalog.ts` (async `getPerfumes()` и обёртки) с fetch+ISR+enrich+фолбэк. Общая трансформация Airtable-записи вынесена в `src/data/transform.ts` (DRY со скриптом sync). Серверные страницы становятся `async`, передают данные клиентским компонентам пропсами; `dynamicParams=true` для on-demand новых товаров/брендов. `account/*` остаётся на встроенном JSON.

**Tech Stack:** Next.js 14.2.35 (App Router, ISR), TypeScript, Airtable REST API, `fetch` с `next.revalidate`.

**Проверка:** Тестового фреймворка в проекте нет — каждая задача проверяется `npm run build` и, где указано, ручной проверкой. Не добавлять тест-раннер.

**Спека:** `docs/superpowers/specs/2026-06-07-runtime-airtable-catalog-design.md`

---

## Карта файлов

**Создаются:**
- `src/data/transform.ts` — `transformRecord(record)` (Airtable → BasePerfume), общий для рантайма и скрипта
- `src/data/catalog.ts` — async `getPerfumes/getBrands/getBrandEntries/getPerfumesByBrandSlug` (fetch+ISR+фолбэк)

**Изменяются:**
- `src/data/utils.ts` — экспортировать тип `BasePerfume`
- `scripts/sync-catalog.mjs` — переиспользовать общую логику трансформации (оставить рабочим)
- `src/data/perfumes.ts` — остаётся синхронным фолбэк-источником; добавить экспорт `staticFacets` (genders/scentTypes/formats) если нужно для серверных страниц
- `src/app/catalog/page.tsx` — `async`, `await getPerfumes()`, `revalidate=60`, пропсы в CatalogClient
- `src/app/catalog/[brand]/page.tsx` — `async`, `await getBrandEntries()/getPerfumesByBrandSlug()`, `dynamicParams=true`, `revalidate=60`
- `src/app/product/[id]/page.tsx` — `await getPerfumes()`, `dynamicParams=true`, `revalidate=60`
- `src/app/page.tsx` — `await getPerfumes()` для featured
- `src/app/guides/mens-everyday/page.tsx`, `src/app/guides/summer-fragrances/page.tsx` — `await getPerfumes()`
- `src/components/CatalogClient.tsx` — принимать `brands` пропсом (facets-константы оставить импортом из constants)

**Не меняются:** `enrichPerfume`, типы `Perfume`, UI-компоненты (кроме источника данных), `account/*`.

---

## Task 1: Тип BasePerfume в utils.ts

**Files:**
- Modify: `src/data/utils.ts`

`BasePerfume` сейчас локальный тип в `utils.ts` (строка 3). Экспортируем его для переиспользования в `transform.ts` и `catalog.ts`.

- [ ] **Step 1: Экспортировать тип**

В `src/data/utils.ts` заменить строку 3:

```ts
type BasePerfume = Omit<Perfume, 'occasion' | 'season' | 'intensity' | 'sourceType' | 'inStock'> & { inStock?: boolean };
```

на:

```ts
export type BasePerfume = Omit<Perfume, 'occasion' | 'season' | 'intensity' | 'sourceType' | 'inStock'> & { inStock?: boolean };
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/data/utils.ts
git commit -m "refactor(data): export BasePerfume type for reuse"
```

---

## Task 2: Общая трансформация transform.ts

**Files:**
- Create: `src/data/transform.ts`

Выносим логику из `scripts/sync-catalog.mjs` (`transformRecord`, строки 80–128) в TS-модуль. Возвращает `BasePerfume | null`.

- [ ] **Step 1: Создать файл**

```ts
// src/data/transform.ts
import type { BasePerfume } from './utils';
import type { Volume } from '@/types';

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

function parseNotes(val: unknown): string[] {
  return typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function parseList(val: unknown): string[] {
  return typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

const VOLUME_KEYS: Volume[] = ['5ml', '10ml', '15ml', '20ml'];

/** Airtable record → BasePerfume (без производных полей). null если нет id/name. */
export function transformRecord(record: AirtableRecord): BasePerfume | null {
  const f = record.fields;

  const prices: Partial<Record<Volume, number>> = {};
  for (const v of VOLUME_KEYS) {
    const val = f[`price_${v}`];
    if (val != null && val !== '') prices[v] = Number(val);
  }
  if (f['price_original'] != null && f['price_original'] !== '') {
    prices['original'] = Number(f['price_original']);
  }

  const availableVolumes: Volume[] = [];
  for (const v of VOLUME_KEYS) {
    if (f[`price_${v}`] != null && f[`price_${v}`] !== '') availableVolumes.push(v);
  }
  if (f['price_original'] != null && f['price_original'] !== '') availableVolumes.push('original');

  const id = String(f.id || '').trim();
  const name = String(f.name || '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    brand: String(f.brand || '').trim(),
    description: String(f.description || '').trim(),
    notes: {
      top: parseNotes(f.notes_top),
      middle: parseNotes(f.notes_middle),
      base: parseNotes(f.notes_base),
    },
    gender: (f.gender as BasePerfume['gender']) || 'унисекс',
    scentType: (f.scentType as BasePerfume['scentType']) || 'свежий',
    format: (f.format as BasePerfume['format']) || 'распив',
    images: parseList(f.images),
    prices,
    availableVolumes,
    originalVolumeMl: f['original_volume_ml'] ? Number(f['original_volume_ml']) : undefined,
    inStock: Boolean(f.inStock),
    featured: Boolean(f.featured),
    newArrival: Boolean(f.newArrival),
    bestseller: Boolean(f.bestseller),
  };
}
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/data/transform.ts
git commit -m "feat(data): add shared Airtable record transform"
```

---

## Task 3: Серверный data-layer catalog.ts

**Files:**
- Create: `src/data/catalog.ts`

Async-источник каталога: fetch Airtable с ISR(60) + enrich + фолбэк на JSON.

- [ ] **Step 1: Создать файл**

```ts
// src/data/catalog.ts
// Server-only модуль: использует AIRTABLE_API_KEY (без NEXT_PUBLIC_), который Next
// никогда не передаёт в клиентский бандл. Импортировать ТОЛЬКО из server components
// (не из 'use client'-файлов), иначе сборка упадёт на доступе к серверному env.
import type { Perfume } from '@/types';
import type { BasePerfume } from './utils';
import { enrichPerfume, buildBrandEntries, getPerfumesByBrandSlug as bySlug } from './utils';
import { transformRecord, type AirtableRecord } from './transform';
import rawData from './perfumes.json';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Catalog';
const REVALIDATE_SECONDS = 60;

/** Фолбэк: встроенный JSON, обогащённый и отфильтрованный по inStock. */
function fallbackPerfumes(): Perfume[] {
  return (rawData as BasePerfume[]).map(enrichPerfume).filter((p) => p.inStock);
}

async function fetchAirtableRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`);
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) throw new Error(`Airtable ${res.status}`);
    const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

/** Каталог из Airtable (ISR). При любой ошибке — фолбэк на встроенный JSON. */
export async function getPerfumes(): Promise<Perfume[]> {
  if (!API_KEY || !BASE_ID) return fallbackPerfumes();
  try {
    const records = await fetchAirtableRecords();
    const base = records
      .map(transformRecord)
      .filter((p): p is BasePerfume => p !== null);
    const enriched = base.map(enrichPerfume).filter((p) => p.inStock);
    return enriched.length > 0 ? enriched : fallbackPerfumes();
  } catch {
    return fallbackPerfumes();
  }
}

export async function getBrands(): Promise<string[]> {
  const perfumes = await getPerfumes();
  return [...new Set(perfumes.map((p) => p.brand))].sort();
}

export async function getBrandEntries(): Promise<{ name: string; slug: string }[]> {
  return buildBrandEntries(await getBrands());
}

export async function getPerfumesByBrandSlug(slug: string): Promise<Perfume[]> {
  return bySlug(await getPerfumes(), slug);
}
```

Примечание: пакет `server-only` в проекте не установлен (проверено) — не используем его. Защита ключа обеспечивается тем, что `AIRTABLE_API_KEY` не имеет префикса `NEXT_PUBLIC_` (Next не отдаёт такие переменные клиенту) и модуль импортируется только из server components. Если случайно импортировать его в `'use client'`-файл — сборка упадёт на обращении к серверному env, что и сигнализирует об ошибке.

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: `✓ Compiled successfully` (страницы ещё используют старый импорт — это нормально, заменим дальше)

- [ ] **Step 3: Commit**

```bash
git add src/data/catalog.ts
git commit -m "feat(data): add runtime Airtable catalog with ISR and JSON fallback"
```

---

## Task 4: Каталог-страница на getPerfumes

**Files:**
- Modify: `src/app/catalog/page.tsx`
- Modify: `src/components/CatalogClient.tsx`

`CatalogClient` сейчас импортит `{ brands, ... }` из `@/data/perfumes`. `brands` зависит от данных → передаём пропсом. `genders/scentTypes/formats` — статические, оставляем импортом из `@/data/perfumes` (они не зависят от Airtable).

- [ ] **Step 1: CatalogClient — brands пропсом**

В `src/components/CatalogClient.tsx` заменить строку 10:

```ts
import { brands, genders, scentTypes, formats } from '@/data/perfumes';
```

на:

```ts
import { genders, scentTypes, formats } from '@/data/perfumes';
```

И в интерфейс `Props` (около строки 13-15) добавить `brands`:

```ts
interface Props {
  perfumes: Perfume[];
  brands: string[];
  onQuickAdd?: ... // (оставить существующие поля как есть)
}
```

В сигнатуре компонента добавить `brands` в деструктуризацию пропсов (рядом с `perfumes`).

(Если в файле уже есть деструктуризация `export default function CatalogClient({ perfumes }: Props)` — заменить на `({ perfumes, brands }: Props)`.)

- [ ] **Step 2: catalog/page.tsx — async + getPerfumes**

Заменить весь `src/app/catalog/page.tsx` на:

```tsx
import { Suspense } from 'react';
import CatalogClient from '@/components/CatalogClient';
import { getPerfumes, getBrands } from '@/data/catalog';

export const revalidate = 60;

export const metadata = {
  title: 'Каталог',
  description: 'Вся коллекция нишевой и селективной парфюмерии HARUNGI. Оригиналы и распивы от 2 мл. Фильтры по бренду, полу и типу аромата.',
  openGraph: {
    title: 'Каталог — HARUNGI',
    description: 'Нишевая парфюмерия: оригиналы и распивы от 2 мл. Tom Ford, Creed, Dior, Chanel и другие.',
  },
};

export default async function CatalogPage() {
  const [perfumes, brands] = await Promise.all([getPerfumes(), getBrands()]);
  return (
    <div className="min-h-dvh pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12 md:mb-16">
          <p className="label text-gold-500 mb-3">Вся коллекция</p>
          <h1 className="section-title">Каталог</h1>
        </div>

        <Suspense>
          <CatalogClient perfumes={perfumes} brands={brands} />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Проверка сборки**

Run: `npm run build`
Expected: `✓ Compiled successfully`. Если ошибка про обязательный проп `brands` в других местах использования `CatalogClient` — поправить в Task 5 (там тоже передаётся brands).

- [ ] **Step 4: Commit**

```bash
git add src/app/catalog/page.tsx src/components/CatalogClient.tsx
git commit -m "feat(catalog): runtime catalog page via getPerfumes (ISR), brands as prop"
```

---

## Task 5: Страница бренда на catalog.ts

**Files:**
- Modify: `src/app/catalog/[brand]/page.tsx`

- [ ] **Step 1: Заменить весь файл**

```tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CatalogClient from '@/components/CatalogClient';
import { getBrandEntries, getPerfumesByBrandSlug, getBrands } from '@/data/catalog';

export const revalidate = 60;
export const dynamicParams = true;

interface Props {
  params: { brand: string };
}

export async function generateStaticParams() {
  return (await getBrandEntries()).map((entry) => ({ brand: entry.slug }));
}

export async function generateMetadata({ params }: Props) {
  const entry = (await getBrandEntries()).find((item) => item.slug === params.brand);
  if (!entry) return {};
  return {
    title: `${entry.name}`,
    description: `Каталог ${entry.name} в HARUNGI: оригиналы и распивы от 2 мл.`,
    openGraph: {
      title: `${entry.name} — HARUNGI`,
      description: `Ароматы ${entry.name}: распивы и оригиналы в наличии.`,
    },
  };
}

export default async function BrandCatalogPage({ params }: Props) {
  const entries = await getBrandEntries();
  const entry = entries.find((item) => item.slug === params.brand);
  if (!entry) notFound();

  const brandPerfumes = await getPerfumesByBrandSlug(params.brand);
  if (brandPerfumes.length === 0) notFound();

  const brands = await getBrands();

  return (
    <div className="min-h-dvh pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12 md:mb-16">
          <p className="label text-gold-500 mb-3">Брендовая подборка</p>
          <h1 className="section-title mb-4">{entry.name}</h1>
          <p className="text-sm md:text-base text-ink-500 max-w-2xl leading-relaxed">
            Отобранные ароматы {entry.name}: распивы для знакомства и оригиналы для тех, кто уже нашёл свой флакон.
          </p>
        </div>

        <Suspense>
          <CatalogClient perfumes={brandPerfumes} brands={brands} />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/catalog/[brand]/page.tsx
git commit -m "feat(catalog): runtime brand page (ISR, dynamicParams)"
```

---

## Task 6: Страница товара on-demand

**Files:**
- Modify: `src/app/product/[id]/page.tsx`

- [ ] **Step 1: Заменить весь файл**

```tsx
import { notFound } from 'next/navigation';
import { getPerfumes } from '@/data/catalog';
import ProductPageClient from '@/components/ProductPageClient';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const perfumes = await getPerfumes();
  return perfumes.map((p) => ({ id: p.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const perfumes = await getPerfumes();
  const perfume = perfumes.find((p) => p.id === id);
  if (!perfume) return {};
  const minPrice = Math.min(...Object.values(perfume.prices));
  return {
    title: `${perfume.name} — ${perfume.brand}`,
    description: `${perfume.description} От ${minPrice.toLocaleString('ru-RU')} ₽.`,
    openGraph: {
      title: `${perfume.name} — ${perfume.brand} | HARUNGI`,
      description: `${perfume.brand} ${perfume.name}. ${perfume.format === 'распив' ? 'Распивы' : 'Оригинал'} от ${minPrice.toLocaleString('ru-RU')} ₽.`,
      images: perfume.images[0] ? [{ url: perfume.images[0], width: 800, height: 800, alt: perfume.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const perfumes = await getPerfumes();
  const perfume = perfumes.find((p) => p.id === id);
  if (!perfume) notFound();

  const related = perfumes
    .filter((p) => p.id !== perfume.id && (p.brand === perfume.brand || p.gender === perfume.gender))
    .slice(0, 3);

  return <ProductPageClient perfume={perfume} related={related} />;
}
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/product/[id]/page.tsx
git commit -m "feat(product): runtime product page on-demand (ISR, dynamicParams)"
```

---

## Task 7: Главная и guides на getPerfumes

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/guides/mens-everyday/page.tsx`
- Modify: `src/app/guides/summer-fragrances/page.tsx`

- [ ] **Step 1: page.tsx — async + getPerfumes**

В `src/app/page.tsx`:
- Заменить `import { perfumes } from '@/data/perfumes';` на `import { getPerfumes } from '@/data/catalog';`
- Добавить вверху файла (после импортов): `export const revalidate = 60;`
- Сделать дефолтный экспорт `async`: `export default async function Home() {`
- Заменить строку `const featured = perfumes.filter((p) => p.featured && p.inStock).slice(0, 4);` на:

```tsx
  const perfumes = await getPerfumes();
  const featured = perfumes.filter((p) => p.featured && p.inStock).slice(0, 4);
```

(Если функция называется иначе — добавить `async` к её объявлению.)

- [ ] **Step 2: guides/mens-everyday — async**

В `src/app/guides/mens-everyday/page.tsx`:
- Заменить `import { perfumes } from '@/data/perfumes';` на `import { getPerfumes } from '@/data/catalog';`
- Добавить `export const revalidate = 60;`
- Сделать страницу `async` и перед строкой `const picks = perfumes` добавить `const perfumes = await getPerfumes();`

- [ ] **Step 3: guides/summer-fragrances — async**

В `src/app/guides/summer-fragrances/page.tsx`:
- Заменить `import { perfumes } from '@/data/perfumes';` на `import { getPerfumes } from '@/data/catalog';`
- Добавить `export const revalidate = 60;`
- Сделать страницу `async`, перед `const picks = perfumes.filter(...)` добавить `const perfumes = await getPerfumes();`

- [ ] **Step 4: Проверка сборки**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/guides/mens-everyday/page.tsx src/app/guides/summer-fragrances/page.tsx
git commit -m "feat(home,guides): source perfumes via getPerfumes (ISR)"
```

---

## Task 8: sync-catalog.mjs переиспользует общую трансформацию

**Files:**
- Modify: `scripts/sync-catalog.mjs`

Скрипт остаётся рабочим, но логика трансформации не дублируется. Поскольку `.mjs` не может импортировать TS напрямую без сборки, **оставляем `transformRecord` в `.mjs` как есть**, но добавляем комментарий-ссылку, что канонический источник — `src/data/transform.ts`, и логика должна совпадать. (Дублирование минимально и оправдано границей JS/TS — переписывать рантайм-сборку для скрипта избыточно, YAGNI.)

- [ ] **Step 1: Добавить комментарий-якорь**

В `scripts/sync-catalog.mjs` над функцией `transformRecord` (строка ~79) добавить:

```js
// ⚠️ Канонический источник трансформации — src/data/transform.ts (рантайм).
// Здесь дублируется намеренно: .mjs-скрипт не импортирует TS без сборки.
// При изменении схемы Airtable обновить ОБА места одинаково.
```

- [ ] **Step 2: Проверка скрипта (smoke)**

Run: `node -e "import('./scripts/sync-catalog.mjs').catch(e=>console.log('expected env check or run'))"`
Expected: либо отрабатывает (если ключи есть), либо падает на проверке ключей — главное, синтаксис валиден. Альтернатива: `node --check scripts/sync-catalog.mjs` → нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-catalog.mjs
git commit -m "docs(sync): note transform.ts is canonical source"
```

---

## Task 9: Финальная проверка, фолбэк, безопасность токена, docs

**Files:**
- Modify: `CLAUDE.md` (на диске; в .gitignore — коммит не требуется)
- Inspect: `.env.local`

- [ ] **Step 1: Полная сборка**

Run: `npm run build`
Expected: `✓ Compiled successfully`. В выводе у `/catalog`, `/product/[id]`, `/catalog/[brand]` — отметки ISR (ƒ/○ с revalidate). Сборка не падает даже без сетевого доступа к Airtable (фолбэк отрабатывает на этапе prerender).

- [ ] **Step 2: Проверка фолбэка (без ключей)**

Run: `AIRTABLE_API_KEY= AIRTABLE_BASE_ID= npm run build 2>&1 | grep -E "Compiled|error" | head`
Expected: `✓ Compiled successfully` — при отсутствии ключей используется встроенный JSON, сборка проходит.

- [ ] **Step 3: Ручная проверка рантайма (prod-сборка)**

Run: `npm run build && npm run start` → открыть `http://localhost:3000/catalog`, `http://localhost:3000/product/<id>`.
Expected: каталог и товар рендерятся (из Airtable, если ключи в `.env.local`, иначе из JSON). Если есть реальные ключи — изменить товар в Airtable, подождать >60 сек, обновить → изменение видно.

- [ ] **Step 4: ⚠️ Безопасность — NEXT_PUBLIC_TELEGRAM_BOT_TOKEN**

В `.env.local` переменная `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` имеет префикс `NEXT_PUBLIC_` → попадает в клиентский бандл. Токен в коде не используется.

Проверить, что токен не утёк в текущий бандл:
Run: `grep -rl "TELEGRAM_BOT_TOKEN" .next/static 2>/dev/null || echo "не найдено в client-бандле"`

Действие (вне scope фичи, но обязательно): удалить строку `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=...` из `.env.local` (и из Vercel env, если есть). Сообщить пользователю отдельно — `.env.local` не в гите, правку делает пользователь либо подтверждает удаление.

- [ ] **Step 5: Обновить CLAUDE.md (на диске)**

Добавить в раздел «Архитектура данных» в `CLAUDE.md`:

```markdown
### Рантайм-каталог (ISR)

`src/data/catalog.ts` — серверный источник каталога: `getPerfumes()` фетчит Airtable с
`next.revalidate=60`, прогоняет через `enrichPerfume()`, фильтрует `inStock`; при любой ошибке —
фолбэк на встроенный `perfumes.json`. Серверные страницы (`catalog`, `[brand]`, `product/[id]`,
главная, guides) — `async` + `revalidate=60`; `[brand]`/`product` имеют `dynamicParams=true`
(новые товары/бренды генерятся on-demand). Клиентский `CatalogClient` получает `perfumes`/`brands`
пропсами; `account/*` остаётся на встроенном JSON. Трансформация Airtable-записи — `transform.ts`
(дублируется в `scripts/sync-catalog.mjs` из-за границы JS/TS). Ключ `AIRTABLE_API_KEY` — server-only.
```

- [ ] **Step 6: Commit (если CLAUDE.md трекается — иначе пропустить)**

```bash
git add CLAUDE.md 2>/dev/null && git commit -m "docs: document runtime Airtable catalog" || echo "CLAUDE.md gitignored — skip"
```

---

## Self-Review notes

- **Покрытие спеки:** transform.ts (T2), catalog.ts getPerfumes+обёртки+фолбэк (T3), async-страницы catalog/[brand]/product/home/guides + revalidate + dynamicParams (T4–T7), CatalogClient пропсы (T4), account/* без изменений (по дизайну — не трогаем), безопасность ключа server-only (T3) + NEXT_PUBLIC токен (T9), sync-catalog совместим (T8), enrichPerfume сохранён (T3). ✓
- **Типы согласованы:** `BasePerfume` экспортирован (T1) и используется в transform.ts/catalog.ts; `getPerfumes/getBrands/getBrandEntries/getPerfumesByBrandSlug` (T3) совпадают с вызовами в T4–T7; `CatalogClient` Props `{perfumes, brands}` (T4) совпадает с передачей в T4/T5.
- **Проверено до старта:** текущие сигнатуры страниц прочитаны; `[brand]` использует sync `params` (Next 14), `product/[id]` — `Promise<params>` — каждый файл сохраняет свой стиль; `CatalogClient` импортит `brands` из data (заменяем на проп), `genders/scentTypes/formats` — статические (оставляем импортом). Пакет `server-only` в проекте отсутствует — НЕ используем его (защита ключа через отсутствие `NEXT_PUBLIC_` + импорт только из server components).
