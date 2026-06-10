// src/data/transform.ts
import type { BasePerfume } from './utils';
import type { Volume } from '@/types';

/** Строка таблицы Supabase `perfumes` (плоские колонки, имена 1:1 с Airtable). */
export type SupabaseRow = Record<string, unknown>;

function parseNotes(val: unknown): string[] {
  return typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function parseList(val: unknown): string[] {
  return typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

const VOLUME_KEYS: Volume[] = ['5ml', '10ml', '15ml', '20ml'];

/** Supabase row → BasePerfume (без производных полей). null если нет id/name. */
export function transformRow(row: SupabaseRow): BasePerfume | null {
  const prices: Partial<Record<Volume, number>> = {};
  for (const v of VOLUME_KEYS) {
    const val = row[`price_${v}`];
    if (val != null && val !== '') prices[v] = Number(val);
  }
  if (row['price_original'] != null && row['price_original'] !== '') {
    prices['original'] = Number(row['price_original']);
  }

  const availableVolumes: Volume[] = [];
  for (const v of VOLUME_KEYS) {
    if (row[`price_${v}`] != null && row[`price_${v}`] !== '') availableVolumes.push(v);
  }
  if (row['price_original'] != null && row['price_original'] !== '') availableVolumes.push('original');

  const id = String(row.id || '').trim();
  const name = String(row.name || '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    brand: String(row.brand || '').trim(),
    description: String(row.description || '').trim(),
    notes: {
      top: parseNotes(row.notes_top),
      middle: parseNotes(row.notes_middle),
      base: parseNotes(row.notes_base),
    },
    gender: (row.gender as BasePerfume['gender']) || 'унисекс',
    scentType: (row.scentType as BasePerfume['scentType']) || 'свежий',
    format: (row.format as BasePerfume['format']) || 'распив',
    images: parseList(row.images),
    prices,
    availableVolumes,
    originalVolumeMl: row['original_volume_ml'] ? Number(row['original_volume_ml']) : undefined,
    inStock: Boolean(row.inStock),
    featured: Boolean(row.featured),
    newArrival: Boolean(row.newArrival),
    bestseller: Boolean(row.bestseller),
  };
}
