import type { Perfume, Occasion, Season, Intensity, SourceType } from '@/types';

/**
 * BasePerfume — то, что приходит из БД (без производных полей). `season`/
 * `occasion` могут быть заданы вручную в админ-боте (CSV-колонки); тогда они
 * перекрывают авто-вывод. Если их нет — поля undefined и работает деривация.
 */
export type BasePerfume = Omit<Perfume, 'occasion' | 'season' | 'intensity' | 'sourceType' | 'inStock'> & {
  inStock?: boolean;
  season?: Season[];
  occasion?: Occasion[];
};

function deriveOccasion(perfume: BasePerfume): Occasion[] {
  const { scentType, gender } = perfume;
  if (scentType === 'свежий') return ['офис', 'ежедневно', 'путешествие'];
  if (scentType === 'цветочный') return ['ежедневно', 'свидание'];
  if (scentType === 'восточный') return ['вечер', 'свидание'];
  if (scentType === 'гурманский') return ['вечер', 'свидание'];
  if (scentType === 'древесный') return gender === 'женский' ? ['ежедневно', 'офис'] : ['офис', 'вечер'];
  if (scentType === 'фужерный') return ['офис', 'ежедневно'];
  if (scentType === 'шипровый') return ['офис', 'вечер'];
  return ['ежедневно'];
}

function deriveSeason(perfume: BasePerfume): Season[] {
  const { scentType } = perfume;
  if (scentType === 'свежий') return ['весна', 'лето'];
  if (scentType === 'цветочный') return ['весна', 'лето', 'осень'];
  if (scentType === 'гурманский' || scentType === 'восточный') return ['осень', 'зима'];
  return ['всесезонный'];
}

function deriveIntensity(perfume: BasePerfume): Intensity {
  const { scentType } = perfume;
  if (scentType === 'свежий') return 'лёгкий';
  if (scentType === 'восточный' || scentType === 'гурманский') return 'насыщенный';
  return 'средний';
}

export function enrichPerfume(perfume: BasePerfume): Perfume {
  // Ручные значения из БД (если заданы в админ-боте) перекрывают авто-вывод.
  const season = perfume.season && perfume.season.length ? perfume.season : deriveSeason(perfume);
  const occasion = perfume.occasion && perfume.occasion.length ? perfume.occasion : deriveOccasion(perfume);
  return {
    ...perfume,
    occasion,
    season,
    intensity: deriveIntensity(perfume),
    inStock: perfume.inStock ?? true,
    sourceType: perfume.format === 'распив' ? 'decant' : 'retail',
  };
}

// Транслитерация кириллицы → латиница (та же таблица, что в админ-боте
// workers/admin-bot.js, чтобы slug бренда на сайте совпадал с логикой бота).
const BRAND_TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

export function slugifyBrand(brand: string): string {
  return brand
    .toLowerCase()
    .split('')
    .map((ch) => (ch in BRAND_TRANSLIT ? BRAND_TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildBrandEntries(brands: string[]) {
  return brands
    .map((brand) => ({ name: brand, slug: slugifyBrand(brand) }))
    .filter((entry) => entry.slug.length > 0);
}

export function getPerfumesByBrandSlug(perfumes: Perfume[], slug: string): Perfume[] {
  const brandName = perfumes.find((p) => slugifyBrand(p.brand) === slug)?.brand;
  if (!brandName) return [];
  return perfumes.filter((p) => p.brand === brandName);
}

/**
 * Lowest valid price across a perfume's volumes, or null when none are set.
 * Guards against `Math.min(...[])` returning Infinity for price-less products.
 */
export function getMinPrice(perfume: Pick<Perfume, 'prices'>): number | null {
  const values = Object.values(perfume.prices).filter(
    (p): p is number => typeof p === 'number' && p > 0
  );
  return values.length > 0 ? Math.min(...values) : null;
}
