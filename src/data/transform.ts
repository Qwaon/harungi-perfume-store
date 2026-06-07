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
