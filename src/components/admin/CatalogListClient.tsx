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
