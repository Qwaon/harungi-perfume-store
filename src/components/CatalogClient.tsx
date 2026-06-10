'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import ProductCard from './ProductCard';
import QuickAddSheet from './QuickAddSheet';
import { Perfume, FilterState } from '@/types';
import { genders, scentTypes, formats } from '@/data/perfumes';
import { pluralizeRu, POSITION_FORMS } from '@/lib/plural';
import { trackEvent } from '@/lib/analytics';
import { getMinPrice } from '@/data/utils';

interface Props {
  perfumes: Perfume[];
  brands: string[];
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

export default function CatalogClient({ perfumes, brands }: Props) {
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
    setFilters((prev) => {
      const next = prev[key] === value ? '' : value;
      // Track only when applying a filter (not when clearing it).
      if (next) trackEvent('catalog_filter', { type: key, value: next });
      return { ...prev, [key]: next };
    });

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
      const minP = getMinPrice(p);
      if (priceActive && minP === null) return false; // price-less products can't match a price range
      if (minP !== null && minVal > 0 && minP < minVal) return false;
      if (minP !== null && maxVal < Infinity && minP > maxVal) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sort === 'popular') result = [...result].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    if (sort === 'price_asc') result = [...result].sort((a, b) => (getMinPrice(a) ?? Infinity) - (getMinPrice(b) ?? Infinity));
    if (sort === 'price_desc') result = [...result].sort((a, b) => (getMinPrice(b) ?? -Infinity) - (getMinPrice(a) ?? -Infinity));
    if (sort === 'new') result = [...result].sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    return result;
  }, [perfumes, filters, search, sort, priceMin, priceMax]);

  useEffect(() => { setCurrentPage(1); }, [filters, search, sort, priceMin, priceMax]);

  // Track search queries (debounced) so we don't fire on every keystroke.
  useEffect(() => {
    const q = search.trim();
    if (!q) return;
    const t = setTimeout(() => trackEvent('catalog_search', { query: q }), 700);
    return () => clearTimeout(t);
  }, [search]);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  useEffect(() => {
    if (!moreOpen) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMore(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [moreOpen, closeMore]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);

  return (
    <div>
      {/* Search + sort */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <svg aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" width="15" height="15" viewBox="0 0 16 16" fill="none">
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
              aria-label="Очистить поиск"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full hover:bg-cream-200 flex items-center justify-center transition-colors"
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
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <Chip label="Все" active={!filters.format} onClick={() => setFilter('format', '')} />
        {formats.map((f) => (
          <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filters.format === f} onClick={() => setFilter('format', f)} />
        ))}

        <div className="w-px h-5 bg-cream-200 shrink-0 mx-1" />

        {genders.map((g) => (
          <Chip key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} active={filters.gender === g} onClick={() => setFilter('gender', g)} />
        ))}

        <div className="w-px h-5 bg-cream-200 shrink-0 mx-1" />

        {scentTypes.slice(0, 4).map((s) => (
          <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={filters.scentType === s} onClick={() => setFilter('scentType', s)} />
        ))}

        <button
          onClick={() => setMoreOpen(true)}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs rounded-full border font-medium transition-all duration-150 ${
            activeFilterCount > 0
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

      {/* Results count — aria-live so screen readers hear the count change as filters/search update */}
      <p className="text-sm text-ink-300 mb-4" aria-live="polite">{filtered.length} {pluralizeRu(filtered.length, POSITION_FORMS)}</p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {paginated.map((p, i) => (
              <ProductCard key={p.id} perfume={p} index={i} priority={i === 0 && currentPage === 1} onQuickAdd={setQuickAddPerfume} />
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

      {/* More filters drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink-900/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Фильтры каталога"
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
                  aria-label="Закрыть фильтры"
                  className="w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center hover:bg-cream-200 transition-colors"
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
                        className={`text-left text-sm min-h-11 flex items-center px-2 rounded-lg transition-colors ${
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
                      type="number" min={0} inputMode="numeric" placeholder="от" value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-gold-500 focus:shadow-[0_0_0_3px_rgba(92,107,63,0.12)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-ink-300 shrink-0">—</span>
                    <input
                      type="number" min={0} inputMode="numeric" placeholder="до" value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-gold-500 focus:shadow-[0_0_0_3px_rgba(92,107,63,0.12)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-cream-200 sticky bottom-0 bg-cream-50" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
                <button onClick={() => setMoreOpen(false)} className="btn-primary w-full">
                  Показать {filtered.length} {pluralizeRu(filtered.length, POSITION_FORMS)}
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
