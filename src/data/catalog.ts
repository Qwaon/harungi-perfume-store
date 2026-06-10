// src/data/catalog.ts
// Server-only модуль: использует SUPABASE_URL / SUPABASE_KEY (без NEXT_PUBLIC_),
// которые Next никогда не передаёт в клиентский бандл. Импортировать ТОЛЬКО из
// server components (не из 'use client'-файлов), иначе сборка упадёт на доступе
// к серверному env.
//
// Источник правды — таблица `perfumes` в Supabase (этап 1 миграции). Читается
// через Supabase REST с ISR (revalidate=60). Фолбэка на perfumes.json больше нет:
// при сбое фетча getPerfumes() бросает ошибку, и Next отдаёт последний удачный
// ISR-кеш страницы вместо пустого каталога (мягкая деградация). perfumes.json
// остаётся только синхронным фолбэком для клиентского account/* (см. perfumes.ts).
import type { Perfume } from '@/types';
import type { BasePerfume } from './utils';
import { enrichPerfume, buildBrandEntries, getPerfumesByBrandSlug as bySlug } from './utils';
import { transformRow, type SupabaseRow } from './transform';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TABLE = 'perfumes';
const REVALIDATE_SECONDS = 60;

async function fetchSupabaseRows(): Promise<SupabaseRow[]> {
  // Env заведомо есть — проверка вынесена в getPerfumes() (см. ниже).
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY as string,
      Authorization: `Bearer ${SUPABASE_KEY as string}`,
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return (await res.json()) as SupabaseRow[];
}

/**
 * Каталог из Supabase (ISR).
 *
 * Два сценария «нет данных» разделены намеренно:
 * - Env (SUPABASE_URL/KEY) не заданы — это сборка/локалка без настроенного
 *   Supabase. Возвращаем []: `npm run build` проходит, страницы становятся
 *   on-demand (dynamicParams=true), наполнятся когда env появится.
 * - Env есть, но фетч упал (не-200/сеть) — это прод-сбой. Бросаем ошибку,
 *   чтобы Next отдал последний удачный ISR-кеш страницы (мягкая деградация),
 *   а не затёр кеш пустым каталогом.
 */
export async function getPerfumes(): Promise<Perfume[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[catalog] SUPABASE_URL/SUPABASE_KEY не заданы — каталог пуст');
    }
    return [];
  }
  const rows = await fetchSupabaseRows();
  return rows
    .map(transformRow)
    .filter((p): p is BasePerfume => p !== null)
    .map(enrichPerfume)
    .filter((p) => p.inStock);
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
