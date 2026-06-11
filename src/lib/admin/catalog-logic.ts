// src/lib/admin/catalog-logic.ts
// Чистые функции каталога (slug/валидация/нормализация) — источник правды для
// веб-админки. Изначально жили в workers/admin-bot.js; бот выводится из
// эксплуатации (см. Фазу 6 плана), дублирования не остаётся.

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function translit(str: string): string {
  return str.split('').map((ch) => {
    const lower = ch.toLowerCase();
    const mapped = TRANSLIT[lower];
    return mapped !== undefined ? mapped : ch;
  }).join('');
}

export function slugify(brand: string, name: string): string {
  const raw = `${brand} ${name}`;
  return translit(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function makeUniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export const ENUMS: Record<string, string[]> = {
  gender: ['мужской', 'женский', 'унисекс'],
  scentType: ['цветочный', 'восточный', 'древесный', 'свежий', 'фужерный', 'шипровый', 'гурманский'],
  format: ['оригинал', 'распив'],
};

export const MULTI_ENUMS: Record<string, string[]> = {
  season: ['весна', 'лето', 'осень', 'зима', 'всесезонный'],
  occasion: ['офис', 'вечер', 'ежедневно', 'свидание', 'путешествие'],
};

export function parseCsv(val: unknown): string[] {
  return typeof val === 'string' && val
    ? val.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
}

const PRICE_STEPS = ['price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original', 'original_volume_ml'];
const REQUIRED_TEXT = ['name', 'brand'];

export type ValidateResult = { ok: true; value: unknown } | { ok: false; error: string };

export function validateField(step: string, raw: unknown): ValidateResult {
  const value = typeof raw === 'string' ? raw.trim() : raw;

  if (REQUIRED_TEXT.includes(step)) {
    if (!value) return { ok: false, error: 'Поле не может быть пустым' };
    return { ok: true, value };
  }
  if (PRICE_STEPS.includes(step)) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return { ok: false, error: 'Введите число' };
    return { ok: true, value: num };
  }
  if (ENUMS[step]) {
    if (!ENUMS[step].includes(value as string)) return { ok: false, error: 'Выберите вариант' };
    return { ok: true, value };
  }
  return { ok: true, value };
}

function csvOrNull(arr: unknown): string | null {
  return Array.isArray(arr) && arr.length ? arr.join(', ') : null;
}
function numOrNull(v: unknown): number | null {
  return v == null || v === '' ? null : Number(v);
}

export interface PerfumeDraft {
  id: string;
  name: string;
  brand: string;
  description?: string;
  notes_top?: string[];
  notes_middle?: string[];
  notes_base?: string[];
  gender?: string;
  scentType?: string;
  format?: string;
  season?: string[];
  occasion?: string[];
  images?: string[];
  price_5ml?: number | string;
  price_10ml?: number | string;
  price_15ml?: number | string;
  price_20ml?: number | string;
  price_original?: number | string;
  original_volume_ml?: number | string;
  inStock?: boolean;
  featured?: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
}

export function draftToPerfumeRow(draft: PerfumeDraft): Record<string, unknown> {
  return {
    id: draft.id,
    name: draft.name,
    brand: draft.brand,
    description: draft.description || null,
    notes_top: csvOrNull(draft.notes_top),
    notes_middle: csvOrNull(draft.notes_middle),
    notes_base: csvOrNull(draft.notes_base),
    gender: draft.gender || null,
    scentType: draft.scentType || null,
    format: draft.format || null,
    season: csvOrNull(draft.season),
    occasion: csvOrNull(draft.occasion),
    images: csvOrNull(draft.images),
    price_5ml: numOrNull(draft.price_5ml),
    price_10ml: numOrNull(draft.price_10ml),
    price_15ml: numOrNull(draft.price_15ml),
    price_20ml: numOrNull(draft.price_20ml),
    price_original: numOrNull(draft.price_original),
    original_volume_ml: numOrNull(draft.original_volume_ml),
    inStock: Boolean(draft.inStock),
    featured: Boolean(draft.featured),
    newArrival: Boolean(draft.newArrival),
    bestseller: Boolean(draft.bestseller),
  };
}
