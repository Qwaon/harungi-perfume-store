# Admin Panel Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk price editing, richer catalog filters/sort/grouping, and a redesigned dashboard with alerts and order-based "top products/brands" to the `/admin` panel.

**Architecture:** Pure price-delta math lives in `catalog-logic.ts` (shared client+server). A new `bulk-price` API route patches multiple `perfumes` rows. `CatalogListClient` gains client-side filter/sort/group/select state and a `BulkPriceModal`. The dashboard (`/admin/page.tsx`) gets new alert/top sections backed by a new `selectAllOrderItems` Supabase helper, computed server-side.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase REST (service role), `node --test` for pure-function tests.

---

### Task 1: `applyPriceDelta` pure function + tests

**Files:**
- Modify: `src/lib/admin/catalog-logic.ts`
- Test: `src/lib/admin/catalog-logic.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/admin/catalog-logic.test.mjs`:

```js
test('applyPriceDelta: percent and fixed, rounding and clamping', () => {
  assert.equal(applyPriceDelta(1000, 'percent', 10), 1100);
  assert.equal(applyPriceDelta(1000, 'percent', -10), 900);
  assert.equal(applyPriceDelta(1000, 'fixed', 100), 1100);
  assert.equal(applyPriceDelta(1000, 'fixed', -1500), 0);
  assert.equal(applyPriceDelta(999, 'percent', 1), 1009); // 999*1.01=1008.99 -> round 1009
  assert.equal(applyPriceDelta(0, 'fixed', -50), 0);
});
```

Add `applyPriceDelta` to the existing import block at the top of the test file:

```js
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  parseCsv, ENUMS, MULTI_ENUMS, applyPriceDelta,
} from './catalog-logic.ts';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/admin/catalog-logic.test.mjs`
Expected: FAIL — `applyPriceDelta is not a function` (or similar import error)

- [ ] **Step 3: Implement `applyPriceDelta`**

Add to `src/lib/admin/catalog-logic.ts` (near the bottom, after `draftToPerfumeRow`):

```ts
export const BULK_PRICE_FIELDS = [
  'price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original',
] as const;

export type BulkPriceField = typeof BULK_PRICE_FIELDS[number];
export type BulkPriceMode = 'percent' | 'fixed';

export function applyPriceDelta(old: number, mode: BulkPriceMode, value: number): number {
  const raw = mode === 'percent' ? old * (1 + value / 100) : old + value;
  return Math.max(0, Math.round(raw));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/admin/catalog-logic.test.mjs`
Expected: PASS (all tests including new one)

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/catalog-logic.ts src/lib/admin/catalog-logic.test.mjs
git commit -m "feat(admin): add applyPriceDelta for bulk price changes"
```

---

### Task 2: `selectAllOrderItems` Supabase helper

**Files:**
- Modify: `src/lib/admin/supabase-server.ts`

- [ ] **Step 1: Add the function**

Add to `src/lib/admin/supabase-server.ts`, after `countOrdersByStatus`:

```ts
// --- Order items (для топов на дашборде) ---

export async function selectAllOrderItems(): Promise<Record<string, unknown>[]> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/order_items?select=perfume_id,perfume_name,brand,quantity`,
    { headers: headers(), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Supabase select order_items ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Sanity check (manual)**

This is a thin REST wrapper matching the existing pattern (`selectOrders`,
`countOrdersByStatus`) — no unit test (requires live Supabase). Verified in
Task 5 via the dashboard page render.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/supabase-server.ts
git commit -m "feat(admin): add selectAllOrderItems for dashboard top-products"
```

---

### Task 3: `POST /api/admin/catalog/bulk-price` route

**Files:**
- Create: `src/app/api/admin/catalog/bulk-price/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/admin/catalog/bulk-price/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPerfumeById, patchPerfume } from '@/lib/admin/supabase-server';
import { applyPriceDelta, BULK_PRICE_FIELDS, type BulkPriceField, type BulkPriceMode } from '@/lib/admin/catalog-logic';

interface BulkPriceRequest {
  ids: string[];
  fields: string[];
  mode: BulkPriceMode;
  value: number;
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as BulkPriceRequest;
    const { ids, fields, mode, value } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'ids: пустой список' }, { status: 400 });
    }
    if (!Array.isArray(fields) || fields.length === 0 || !fields.every((f) => (BULK_PRICE_FIELDS as readonly string[]).includes(f))) {
      return NextResponse.json({ ok: false, error: 'fields: недопустимые поля' }, { status: 400 });
    }
    if (mode !== 'percent' && mode !== 'fixed') {
      return NextResponse.json({ ok: false, error: 'mode: percent | fixed' }, { status: 400 });
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return NextResponse.json({ ok: false, error: 'value: число' }, { status: 400 });
    }

    let updated = 0;
    for (const id of ids) {
      const row = await getPerfumeById(id);
      if (!row) continue;
      const patch: Record<string, number> = {};
      for (const field of fields as BulkPriceField[]) {
        const current = row[field];
        if (typeof current !== 'number') continue;
        patch[field] = applyPriceDelta(current, mode, value);
      }
      if (Object.keys(patch).length > 0) {
        await patchPerfume(id, patch);
        updated += 1;
      }
    }

    revalidatePath('/catalog');
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: build succeeds (TypeScript types check out — `getPerfumeById`,
`patchPerfume`, `applyPriceDelta`, `BULK_PRICE_FIELDS` all exist from prior tasks).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/catalog/bulk-price/route.ts
git commit -m "feat(admin): add bulk price PATCH endpoint"
```

---

### Task 4: `BulkPriceModal` component

**Files:**
- Create: `src/components/admin/BulkPriceModal.tsx`

This component receives the currently-selected perfume rows (with id, brand,
name, and the 5 price fields) and renders a modal with field chips, mode
toggle, value input, preview table, and apply button.

- [ ] **Step 1: Write the component**

```tsx
// src/components/admin/BulkPriceModal.tsx
'use client';

import { useState } from 'react';
import { applyPriceDelta, BULK_PRICE_FIELDS, type BulkPriceField, type BulkPriceMode } from '@/lib/admin/catalog-logic';

const FIELD_LABELS: Record<BulkPriceField, string> = {
  price_5ml: '5мл',
  price_10ml: '10мл',
  price_15ml: '15мл',
  price_20ml: '20мл',
  price_original: 'Оригинал',
};

export interface BulkPriceItem {
  id: string;
  brand: string;
  name: string;
  price_5ml: number | null;
  price_10ml: number | null;
  price_15ml: number | null;
  price_20ml: number | null;
  price_original: number | null;
}

interface PreviewRow {
  id: string;
  label: string;
  field: BulkPriceField;
  fieldLabel: string;
  oldValue: number;
  newValue: number;
}

export default function BulkPriceModal({
  items, onClose, onApplied,
}: {
  items: BulkPriceItem[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [fields, setFields] = useState<BulkPriceField[]>([]);
  const [mode, setMode] = useState<BulkPriceMode>('percent');
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  const toggleField = (f: BulkPriceField) => {
    setFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
    setPreview(null);
  };

  const numValue = Number(value);
  const valid = fields.length > 0 && value !== '' && Number.isFinite(numValue);

  const buildPreview = (): PreviewRow[] => {
    const rows: PreviewRow[] = [];
    for (const item of items) {
      for (const field of fields) {
        const old = item[field];
        if (old == null) continue;
        rows.push({
          id: item.id,
          label: `${item.brand} — ${item.name}`,
          field,
          fieldLabel: FIELD_LABELS[field],
          oldValue: old,
          newValue: applyPriceDelta(old, mode, numValue),
        });
      }
    }
    return rows;
  };

  const handlePreview = () => {
    setError('');
    if (!valid) { setError('Выберите поля и укажите значение'); return; }
    const rows = buildPreview();
    if (rows.length === 0) { setError('Нет товаров с заполненными выбранными полями'); return; }
    setPreview(rows);
  };

  const apply = async () => {
    setApplying(true); setError('');
    const res = await fetch('/api/admin/catalog/bulk-price', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: items.map((i) => i.id), fields, mode, value: numValue }),
    });
    setApplying(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) {
      onApplied();
    } else {
      setError(d.error || 'Ошибка применения');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true" aria-label="Массовое изменение цен">
      <div className="bg-cream-50 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 flex flex-col gap-4">
        <h2 className="font-display text-xl font-light text-ink-900">
          Изменить цены ({items.length})
        </h2>

        <div>
          <span className="label text-ink-500 block mb-1">Поля</span>
          <div className="flex flex-wrap gap-1.5">
            {BULK_PRICE_FIELDS.map((f) => (
              <button key={f} type="button" onClick={() => toggleField(f)}
                className={`text-xs px-3 py-1.5 rounded-full border ${fields.includes(f) ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
                {FIELD_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div>
            <span className="label text-ink-500 block mb-1">Тип</span>
            <div className="flex gap-1.5">
              {(['percent', 'fixed'] as BulkPriceMode[]).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setPreview(null); }}
                  className={`text-xs px-3 py-1.5 rounded-full border ${mode === m ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
                  {m === 'percent' ? 'На процент' : 'На сумму'}
                </button>
              ))}
            </div>
          </div>
          <label className="block flex-1">
            <span className="label text-ink-500 block mb-1">
              Значение {mode === 'percent' ? '(%, напр. -10)' : '(₽, напр. +100)'}
            </span>
            <input
              inputMode="numeric"
              value={value}
              onChange={(e) => { setValue(e.target.value); setPreview(null); }}
              className="input-base"
              placeholder={mode === 'percent' ? '+10' : '+100'}
            />
          </label>
        </div>

        {error && <p role="alert" className="text-sm text-ink-500">{error}</p>}

        {preview && (
          <div className="border border-cream-200 rounded-lg max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-cream-100">
                <tr>
                  <th className="text-left p-2 label text-ink-300">Товар</th>
                  <th className="text-left p-2 label text-ink-300">Поле</th>
                  <th className="text-right p-2 label text-ink-300">Было</th>
                  <th className="text-right p-2 label text-ink-300">Станет</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={`${row.id}-${row.field}`} className={i % 2 ? 'bg-cream-50' : ''}>
                    <td className="p-2 text-ink-900 truncate max-w-[160px]">{row.label}</td>
                    <td className="p-2 text-ink-500">{row.fieldLabel}</td>
                    <td className="p-2 text-right text-ink-500">{row.oldValue}</td>
                    <td className="p-2 text-right text-ink-900 font-medium">{row.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-outline text-sm">Отмена</button>
          {!preview ? (
            <button type="button" onClick={handlePreview} className="btn-primary text-sm" disabled={!valid}>
              Предпросмотр
            </button>
          ) : (
            <button type="button" onClick={apply} disabled={applying} className="btn-primary text-sm disabled:opacity-50">
              {applying ? 'Применение…' : `Применить (${preview.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: succeeds. (Component isn't wired up yet, but TS must resolve all
imports/types — `applyPriceDelta`, `BULK_PRICE_FIELDS`, `BulkPriceField`,
`BulkPriceMode` from Task 1.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BulkPriceModal.tsx
git commit -m "feat(admin): add BulkPriceModal component"
```

---

### Task 5: `CatalogListClient` — filters, sort, grouping, selection, bulk modal

**Files:**
- Modify: `src/components/admin/CatalogListClient.tsx`

This is the largest task. Replace the file entirely with the enhanced version.

- [ ] **Step 1: Replace `CatalogListClient.tsx`**

```tsx
// src/components/admin/CatalogListClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ENUMS } from '@/lib/admin/catalog-logic';
import BulkPriceModal, { type BulkPriceItem } from './BulkPriceModal';

interface P {
  id: string; brand: string; name: string; images: string | null; inStock: boolean;
  gender: string | null; scentType: string | null; format: string | null;
  featured: boolean; newArrival: boolean; bestseller: boolean;
  price_5ml: number | null; price_10ml: number | null; price_15ml: number | null;
  price_20ml: number | null; price_original: number | null;
}

type SortKey = 'brand' | 'name' | 'inStock' | 'price';
type AlertFilter = 'no-photo' | 'no-price' | 'out-of-stock';

const PRICE_FIELDS: [keyof P, string][] = [
  ['price_5ml', '5мл'], ['price_10ml', '10мл'], ['price_15ml', '15мл'],
  ['price_20ml', '20мл'], ['price_original', 'ориг'],
];

function priceSummary(p: P): string {
  return PRICE_FIELDS
    .filter(([k]) => typeof p[k] === 'number')
    .map(([k, label]) => `${label} ${p[k]}`)
    .join(' · ');
}

function hasNoPrice(p: P): boolean {
  return PRICE_FIELDS.every(([k]) => p[k] == null || p[k] === 0);
}

export default function CatalogListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<P[] | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('brand');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
  const [genderFilter, setGenderFilter] = useState('');
  const [scentFilter, setScentFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState<'' | 'featured' | 'newArrival' | 'bestseller'>('');
  const [alertFilter, setAlertFilter] = useState<AlertFilter | ''>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/catalog');
    const d = await res.json().catch(() => ({ perfumes: [] }));
    setItems(Array.isArray(d.perfumes) ? d.perfumes : []);
  };
  useEffect(() => { load(); }, []);

  // Прочитать ?alert= один раз при монтировании.
  useEffect(() => {
    const alert = searchParams.get('alert');
    if (alert === 'no-photo' || alert === 'no-price' || alert === 'out-of-stock') {
      setAlertFilter(alert);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (id: string) => {
    if (!confirm(`Удалить «${id}»? Необратимо.`)) return;
    await fetch(`/api/admin/catalog/${id}`, { method: 'DELETE' });
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    load();
  };

  const filtered = useMemo(() => {
    let list = (items ?? []).filter((p) =>
      `${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase()));

    if (stockFilter === 'in') list = list.filter((p) => p.inStock);
    if (stockFilter === 'out') list = list.filter((p) => !p.inStock);
    if (genderFilter) list = list.filter((p) => p.gender === genderFilter);
    if (scentFilter) list = list.filter((p) => p.scentType === scentFilter);
    if (formatFilter) list = list.filter((p) => p.format === formatFilter);
    if (flagFilter) list = list.filter((p) => Boolean(p[flagFilter]));
    if (alertFilter === 'no-photo') list = list.filter((p) => !p.images);
    if (alertFilter === 'no-price') list = list.filter(hasNoPrice);
    if (alertFilter === 'out-of-stock') list = list.filter((p) => !p.inStock);

    const sorted = [...list];
    if (sort === 'brand') sorted.sort((a, b) => a.brand.localeCompare(b.brand, 'ru'));
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    else if (sort === 'inStock') sorted.sort((a, b) => Number(b.inStock) - Number(a.inStock));
    else if (sort === 'price') {
      sorted.sort((a, b) => {
        const av = a.price_5ml ?? Infinity;
        const bv = b.price_5ml ?? Infinity;
        return av - bv;
      });
    }
    return sorted;
  }, [items, q, sort, stockFilter, genderFilter, scentFilter, formatFilter, flagFilter, alertFilter]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => setSelected(new Set(filtered.map((p) => p.id)));
  const clearSelection = () => setSelected(new Set());

  const selectedItems: BulkPriceItem[] = useMemo(
    () => (items ?? [])
      .filter((p) => selected.has(p.id))
      .map((p) => ({
        id: p.id, brand: p.brand, name: p.name,
        price_5ml: p.price_5ml, price_10ml: p.price_10ml, price_15ml: p.price_15ml,
        price_20ml: p.price_20ml, price_original: p.price_original,
      })),
    [items, selected]
  );

  let lastBrand: string | null = null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-light text-ink-900">Каталог</h1>
        <Link href="/admin/catalog/new" className="btn-primary text-sm">➕ Добавить</Link>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по бренду/названию" className="input-base mb-3" />

      <div className="flex flex-wrap gap-2 mb-3">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-base w-auto text-sm">
          <option value="brand">Сортировка: бренд</option>
          <option value="name">Сортировка: название</option>
          <option value="inStock">Сортировка: наличие</option>
          <option value="price">Сортировка: цена 5мл</option>
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as 'all' | 'in' | 'out')} className="input-base w-auto text-sm">
          <option value="all">Наличие: все</option>
          <option value="in">В наличии</option>
          <option value="out">Нет в наличии</option>
        </select>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="input-base w-auto text-sm">
          <option value="">Пол: все</option>
          {ENUMS.gender.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={scentFilter} onChange={(e) => setScentFilter(e.target.value)} className="input-base w-auto text-sm">
          <option value="">Тип аромата: все</option>
          {ENUMS.scentType.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)} className="input-base w-auto text-sm">
          <option value="">Формат: все</option>
          {ENUMS.format.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value as typeof flagFilter)} className="input-base w-auto text-sm">
          <option value="">Флаги: все</option>
          <option value="featured">Featured</option>
          <option value="newArrival">Новинка</option>
          <option value="bestseller">Хит</option>
        </select>
        {alertFilter && (
          <button type="button" onClick={() => setAlertFilter('')} className="text-xs px-3 py-1.5 rounded-full border border-gold-500 text-gold-500">
            Алерт: {alertFilter} ✕
          </button>
        )}
      </div>

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

      {items === null ? <p className="text-ink-300 text-sm">Загрузка…</p> : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const groupHeader = sort === 'brand' && p.brand !== lastBrand;
            lastBrand = p.brand;
            return (
              <div key={p.id}>
                {groupHeader && (
                  <div className="sticky top-14 bg-cream-100 px-1 py-1 label text-ink-300 z-10">{p.brand}</div>
                )}
                <div className="flex items-center gap-3 rounded-xl bg-cream-50 px-3 py-2" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 shrink-0" aria-label={`Выбрать ${p.brand} ${p.name}`} />
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBulk && (
        <BulkPriceModal
          items={selectedItems}
          onClose={() => setShowBulk(false)}
          onApplied={() => { setShowBulk(false); clearSelection(); load(); router.refresh(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: succeeds. `useSearchParams` requires the page to allow client
suspense — check Step 3 if build errors mention `useSearchParams() should be wrapped in a suspense boundary`.

- [ ] **Step 3: If build fails on `useSearchParams` suspense boundary**

Check `src/app/admin/catalog/page.tsx` (currently 5 lines). If it errors,
wrap with `Suspense`:

```tsx
import { Suspense } from 'react';
import CatalogListClient from '@/components/admin/CatalogListClient';

export default function CatalogPage() {
  return (
    <Suspense fallback={<p className="text-ink-300 text-sm">Загрузка…</p>}>
      <CatalogListClient />
    </Suspense>
  );
}
```

- [ ] **Step 4: Run build again**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/CatalogListClient.tsx src/app/admin/catalog/page.tsx
git commit -m "feat(admin): add catalog filters, sort, grouping, bulk price selection"
```

---

### Task 6: Dashboard redesign — alerts + top products/brands

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Replace `src/app/admin/page.tsx`**

```tsx
import Link from 'next/link';
import { countOrdersByStatus, selectPerfumes, selectAllOrderItems } from '@/lib/admin/supabase-server';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новые', accepted: 'Принят', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён',
};

const STATUS_ICONS: Record<string, string> = {
  total: '📋', new: '🆕', accepted: '✅', shipped: '📦', done: '✔️', canceled: '✖️',
};

const PRICE_FIELDS = ['price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original'] as const;

interface Perfume {
  id: string; brand: string; name: string; images: string | null; inStock: boolean;
  price_5ml: number | null; price_10ml: number | null; price_15ml: number | null;
  price_20ml: number | null; price_original: number | null;
}

interface OrderItem {
  perfume_id: string | null; perfume_name: string; brand: string; quantity: number;
}

function hasNoPrice(p: Perfume): boolean {
  return PRICE_FIELDS.every((k) => p[k] == null || p[k] === 0);
}

function topBy(items: OrderItem[], key: 'perfume' | 'brand'): { label: string; qty: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = key === 'perfume' ? (item.perfume_name || item.perfume_id || '—') : item.brand;
    if (!label) continue;
    totals.set(label, (totals.get(label) ?? 0) + (item.quantity || 0));
  }
  return [...totals.entries()]
    .map(([label, qty]) => ({ label, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

export default async function AdminDashboard() {
  let counts: Record<string, number> = {};
  let perfumes: Perfume[] = [];
  let orderItems: OrderItem[] = [];
  try {
    counts = await countOrdersByStatus();
    perfumes = (await selectPerfumes()) as unknown as Perfume[];
    orderItems = (await selectAllOrderItems()) as unknown as OrderItem[];
  } catch { /* нет env/сети — покажем нули */ }

  const noPhoto = perfumes.filter((p) => !p.images);
  const noPrice = perfumes.filter(hasNoPrice);
  const outOfStock = perfumes.filter((p) => !p.inStock);

  const topProducts = topBy(orderItems, 'perfume');
  const topBrands = topBy(orderItems, 'brand');

  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Дашборд</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">{STATUS_ICONS.total} Всего заказов</p>
          <p className="font-display text-3xl font-light text-gold-500">{counts.total ?? 0}</p>
        </div>
        {['new', 'accepted', 'shipped', 'done', 'canceled'].map((s) => (
          <div key={s} className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">{STATUS_ICONS[s]} {STATUS_LABELS[s]}</p>
            <p className="font-display text-3xl font-light text-ink-900">{counts[s] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">🧴 Товаров</p>
          <p className="font-display text-3xl font-light text-ink-900">{perfumes.length}</p>
        </div>
      </div>

      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Требует внимания</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {noPhoto.length > 0 && (
          <Link href="/admin/catalog?alert=no-photo" className="rounded-xl bg-cream-50 p-4 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">📷 Без фото</p>
            <p className="font-display text-2xl font-light text-gold-500">{noPhoto.length}</p>
          </Link>
        )}
        {noPrice.length > 0 && (
          <Link href="/admin/catalog?alert=no-price" className="rounded-xl bg-cream-50 p-4 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">💰 Без цен</p>
            <p className="font-display text-2xl font-light text-gold-500">{noPrice.length}</p>
          </Link>
        )}
        {outOfStock.length > 0 && (
          <Link href="/admin/catalog?alert=out-of-stock" className="rounded-xl bg-cream-50 p-4 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">🚫 Нет в наличии</p>
            <p className="font-display text-2xl font-light text-gold-500">{outOfStock.length}</p>
          </Link>
        )}
        {noPhoto.length === 0 && noPrice.length === 0 && outOfStock.length === 0 && (
          <p className="text-sm text-ink-300 col-span-full">Проблем не найдено 🎉</p>
        )}
      </div>

      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Топ продаж</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2">Топ товаров</p>
          {topProducts.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topProducts.map((t, i) => (
                <li key={t.label} className="flex justify-between gap-2">
                  <span className="truncate">{i + 1}. {t.label}</span>
                  <span className="text-ink-300 shrink-0">{t.qty} шт</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2">Топ брендов</p>
          {topBrands.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topBrands.map((t, i) => (
                <li key={t.label} className="flex justify-between gap-2">
                  <span className="truncate">{i + 1}. {t.label}</span>
                  <span className="text-ink-300 shrink-0">{t.qty} шт</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/orders" className="btn-outline text-sm">К заказам</Link>
        <Link href="/admin/catalog" className="btn-outline text-sm">К каталогу</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): redesign dashboard with alerts and top products/brands"
```

---

### Task 7: Manual verification

**Files:** none (manual browser check)

- [ ] **Step 1: Start production build**

Run: `npm run build && npm run start`

- [ ] **Step 2: Verify dashboard**

Open `/admin` (login if needed with `ADMIN_PASSWORD`). Confirm:
- Stat cards render with icons.
- "Требует внимания" shows alert cards (or "Проблем не найдено") with working links to `/admin/catalog?alert=...`.
- "Топ продаж" shows top products/brands or "Пока нет данных".

- [ ] **Step 3: Verify catalog filters/sort/grouping**

Open `/admin/catalog`. Confirm:
- Sort by "бренд" shows sticky brand-group headers.
- Filters (наличие/пол/тип/формат/флаги) narrow the list correctly.
- Navigating from a dashboard alert link pre-applies the corresponding filter.
- Price summary (`5мл 1200 · ...`) shows on each row.

- [ ] **Step 4: Verify bulk price edit**

Select 2-3 items via checkboxes, click "Изменить цены (N)". Choose a field
(e.g. 5мл), mode "На сумму", value `+50`. Click "Предпросмотр" — verify
old→new values are correct (+50 each, clamped at 0). Click "Применить" —
confirm success, list refreshes with new prices, modal closes.

- [ ] **Step 5: Run full test suite**

Run: `npx tsx --test src/lib/admin/*.test.mjs`
Expected: all pass.

---

## Self-Review Notes

- Spec coverage: filters/sort/group/select (Task 5), bulk price modal+preview
  (Task 4), bulk price API (Task 3), price-delta math (Task 1), dashboard
  alerts + top products/brands (Task 6, Task 2), `?alert=` deep link (Task 5/6).
- `BULK_PRICE_FIELDS`/`BulkPriceField`/`BulkPriceMode`/`applyPriceDelta` are
  defined once in Task 1 and reused identically in Tasks 3, 4, 5.
- No placeholders — all code blocks are complete and runnable.
