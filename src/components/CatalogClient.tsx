'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard';
import { Perfume, FilterState } from '@/types';
import { brands, genders, scentTypes, formats } from '@/data/perfumes';

interface Props {
  perfumes: Perfume[];
}

const EMPTY_FILTERS: FilterState = { brand: '', gender: '', scentType: '', format: '' };
type SortOption = 'default' | 'price_asc' | 'price_desc' | 'new';

const SORT_LABELS: Record<SortOption, string> = {
  default: 'По умолчанию',
  price_asc: 'Цена: дешевле',
  price_desc: 'Цена: дороже',
  new: 'Новинки',
};

// --- Accordion section ---
function FilterSection({
  title,
  activeCount,
  children,
  defaultOpen = true,
}: {
  title: string;
  activeCount: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-cream-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3.5 text-left group"
      >
        <span className="text-sm font-medium text-ink-900 group-hover:text-ink-500 transition-colors">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-ink-900 text-white text-[10px] flex items-center justify-center font-medium">
              {activeCount}
            </span>
          )}
          <motion.svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <path d="M2 5l5 5 5-5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Checkbox row ---
function CheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full py-1.5 group text-left"
    >
      <span
        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-150 ${
          checked ? 'bg-ink-900 border-ink-900' : 'border-cream-300 group-hover:border-ink-500'
        }`}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6 8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`text-sm transition-colors duration-150 ${checked ? 'text-ink-900 font-medium' : 'text-ink-500 group-hover:text-ink-900'}`}>
        {label}
      </span>
    </button>
  );
}

// --- Pill toggle ---
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs rounded-full border font-medium transition-all duration-150 ${
        active
          ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
          : 'bg-white text-ink-500 border-cream-200 hover:border-ink-500 hover:text-ink-900'
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('default');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const setFilter = (key: keyof FilterState, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? '' : value }));

  const clearAll = () => { setFilters(EMPTY_FILTERS); setSearch(''); setSort('default'); setPriceMin(''); setPriceMax(''); };

  const priceActive = priceMin !== '' || priceMax !== '';

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length +
    (search ? 1 : 0) +
    (priceActive ? 1 : 0);

  const filtered = useMemo(() => {
    const minVal = priceMin ? parseInt(priceMin) : 0;
    const maxVal = priceMax ? parseInt(priceMax) : Infinity;
    let result = perfumes.filter((p) => {
      if (filters.brand && p.brand !== filters.brand) return false;
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.scentType && p.scentType !== filters.scentType) return false;
      if (filters.format && p.format !== filters.format) return false;
      const minP = Math.min(...Object.values(p.prices));
      if (minVal > 0 && minP < minVal) return false;
      if (maxVal < Infinity && minP > maxVal) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sort === 'price_asc') result = [...result].sort((a, b) => Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices)));
    if (sort === 'price_desc') result = [...result].sort((a, b) => Math.min(...Object.values(b.prices)) - Math.min(...Object.values(a.prices)));
    if (sort === 'new') result = [...result].sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    return result;
  }, [perfumes, filters, search, sort, priceMin, priceMax]);

  const FilterContent = () => (
    <div>
      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors mb-4 group"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="group-hover:underline underline-offset-2">Сбросить всё ({activeFilterCount})</span>
        </button>
      )}

      {/* Price */}
      <FilterSection title="Цена, ₽" activeCount={priceActive ? 1 : 0}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min={0}
              placeholder="от"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-900/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <span className="text-ink-300 text-sm shrink-0">—</span>
          <div className="relative flex-1">
            <input
              type="number"
              min={0}
              placeholder="до"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-full bg-cream-100 border border-cream-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-900/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
        {priceActive && (
          <button
            onClick={() => { setPriceMin(''); setPriceMax(''); }}
            className="mt-2 text-xs text-ink-300 hover:text-ink-900 transition-colors underline underline-offset-2"
          >
            Сбросить цену
          </button>
        )}
      </FilterSection>

      {/* Format */}
      <FilterSection title="Формат" activeCount={filters.format ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {formats.map((f) => (
            <Pill key={f} label={f} active={filters.format === f} onClick={() => setFilter('format', f)} />
          ))}
        </div>
      </FilterSection>

      {/* Gender */}
      <FilterSection title="Пол" activeCount={filters.gender ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {genders.map((g) => (
            <Pill key={g} label={g} active={filters.gender === g} onClick={() => setFilter('gender', g)} />
          ))}
        </div>
      </FilterSection>

      {/* Scent type */}
      <FilterSection title="Тип аромата" activeCount={filters.scentType ? 1 : 0}>
        <div className="flex flex-col">
          {scentTypes.map((s) => (
            <CheckRow key={s} label={s} checked={filters.scentType === s} onClick={() => setFilter('scentType', s)} />
          ))}
        </div>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Бренд" activeCount={filters.brand ? 1 : 0} defaultOpen={false}>
        <div className="flex flex-col max-h-48 overflow-y-auto pr-1">
          {brands.map((b) => (
            <CheckRow key={b} label={b} checked={filters.brand === b} onClick={() => setFilter('brand', b)} />
          ))}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div>
      {/* Search + sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                <path d="M1 1l8 8M9 1L1 9" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="input-base sm:w-44 cursor-pointer"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
            <option key={k} value={k}>{SORT_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* Mobile filter toggle */}
      <div className="md:hidden mb-5 flex items-center justify-between">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm text-ink-700 bg-white border border-cream-200 px-4 py-2.5 rounded-lg hover:border-ink-500 transition-all duration-200"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Фильтры
          {activeFilterCount > 0 && (
            <span className="bg-ink-900 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>
        <p className="text-sm text-ink-300">{filtered.length} позиций</p>
      </div>

      <div className="flex gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="sticky top-28 bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-ink-900">Фильтры</p>
              {activeFilterCount > 0 && (
                <span className="text-xs text-ink-300">{activeFilterCount} активно</span>
              )}
            </div>
            {FilterContent()}
          </div>
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFiltersOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[340px] bg-white shadow-2xl overflow-y-auto md:hidden flex flex-col"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between p-5 border-b border-cream-200 sticky top-0 bg-white z-10">
                  <p className="font-semibold text-ink-900">Фильтры</p>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center hover:bg-cream-200 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1l12 12M13 1L1 13" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="p-5 flex-1">
                  {FilterContent()}
                </div>
                <div className="p-5 border-t border-cream-200 sticky bottom-0 bg-white" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
                  <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full">
                    Показать {filtered.length} позиций
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {/* Desktop count + active chips */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, val]) =>
                val ? (
                  <button
                    key={key}
                    onClick={() => setFilter(key as keyof FilterState, val)}
                    className="flex items-center gap-1.5 bg-ink-900 text-white text-xs px-3 py-1.5 rounded-full hover:bg-ink-700 transition-colors"
                  >
                    {val}
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1l6 6M7 1L1 7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : null
              )}
            </div>
            <p className="text-sm text-ink-300 shrink-0">{filtered.length} позиций</p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} perfume={p} index={i} />
              ))}
            </div>
          ) : (
            <motion.div
              className="flex flex-col items-center justify-center py-24 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="#999" strokeWidth="1.5"/>
                  <path d="M21 21l-4.35-4.35" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 11h6M11 8v6" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="font-display text-3xl font-light text-ink-900 mb-2">Ничего не найдено</p>
              <p className="text-ink-300 text-sm mb-8">Попробуйте изменить фильтры или поисковый запрос</p>
              <button onClick={clearAll} className="btn-outline">Сбросить всё</button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
