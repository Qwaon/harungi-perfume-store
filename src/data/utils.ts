import type { Perfume, Occasion, Season, Intensity, SourceType } from '@/types';

type BasePerfume = Omit<Perfume, 'occasion' | 'season' | 'intensity' | 'inStock' | 'sourceType'>;

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
  return {
    ...perfume,
    occasion: deriveOccasion(perfume),
    season: deriveSeason(perfume),
    intensity: deriveIntensity(perfume),
    inStock: true,
    sourceType: perfume.format === 'распив' ? 'decant' : 'retail',
  };
}

export function slugifyBrand(brand: string): string {
  return brand
    .toLowerCase()
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
