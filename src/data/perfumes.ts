import type { Perfume } from '@/types';
import { enrichPerfume, slugifyBrand, buildBrandEntries, getPerfumesByBrandSlug as getPerfumesByBrandSlugUtil } from './utils';
import rawData from './perfumes.json';

type RawPerfume = Omit<Perfume, 'occasion' | 'season' | 'intensity' | 'inStock' | 'sourceType'>;

export const perfumes: Perfume[] = (rawData as RawPerfume[]).map(enrichPerfume);

export const brands = [...new Set(perfumes.map((p) => p.brand))].sort();
export const genders: string[] = ['мужской', 'женский', 'унисекс'];
export const scentTypes: string[] = [
  'цветочный',
  'восточный',
  'древесный',
  'свежий',
  'фужерный',
  'шипровый',
  'гурманский',
];
export const formats: string[] = ['оригинал', 'распив'];
export const seasons: string[] = ['весна', 'лето', 'осень', 'зима', 'всесезонный'];
export const intensities: string[] = ['лёгкий', 'средний', 'насыщенный'];

export { slugifyBrand };
export const brandEntries = buildBrandEntries(brands);
export function getPerfumesByBrandSlug(slug: string): Perfume[] {
  return getPerfumesByBrandSlugUtil(perfumes, slug);
}
