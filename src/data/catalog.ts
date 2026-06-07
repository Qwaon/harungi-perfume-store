// src/data/catalog.ts
// Server-only модуль: использует AIRTABLE_API_KEY (без NEXT_PUBLIC_), который Next
// никогда не передаёт в клиентский бандл. Импортировать ТОЛЬКО из server components
// (не из 'use client'-файлов), иначе сборка упадёт на доступе к серверному env.
import type { Perfume } from '@/types';
import type { BasePerfume } from './utils';
import { enrichPerfume, buildBrandEntries, getPerfumesByBrandSlug as bySlug } from './utils';
import { transformRecord, type AirtableRecord } from './transform';
import rawData from './perfumes.json';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Catalog';
const REVALIDATE_SECONDS = 60;

/** Фолбэк: встроенный JSON, обогащённый и отфильтрованный по inStock. */
function fallbackPerfumes(): Perfume[] {
  return (rawData as BasePerfume[]).map(enrichPerfume).filter((p) => p.inStock);
}

async function fetchAirtableRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`);
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) throw new Error(`Airtable ${res.status}`);
    const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

/** Каталог из Airtable (ISR). При любой ошибке — фолбэк на встроенный JSON. */
export async function getPerfumes(): Promise<Perfume[]> {
  if (!API_KEY || !BASE_ID) return fallbackPerfumes();
  try {
    const records = await fetchAirtableRecords();
    const base = records
      .map(transformRecord)
      .filter((p): p is BasePerfume => p !== null);
    const enriched = base.map(enrichPerfume).filter((p) => p.inStock);
    return enriched.length > 0 ? enriched : fallbackPerfumes();
  } catch {
    return fallbackPerfumes();
  }
}

export async function getBrands(): Promise<string[]> {
  const perfumes = await getPerfumes();
  return [...new Set(perfumes.map((p) => p.brand))].sort();
}

export async function getBrandEntries(): Promise<{ name: string; slug: string }[]> {
  return buildBrandEntries(await getBrands());
}

export async function getPerfumesByBrandSlug(slug: string): Promise<Perfume[]> {
  return bySlug(await getPerfumes(), slug);
}
