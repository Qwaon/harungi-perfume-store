/**
 * sync-catalog.mjs
 *
 * Скачивает все записи из Airtable и записывает в src/data/perfumes.json.
 * Запуск: npm run sync-catalog
 *
 * Требуется в .env.local:
 *   AIRTABLE_API_KEY=your_personal_access_token
 *   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
 *   AIRTABLE_TABLE_NAME=Catalog   (опционально, по умолчанию "Catalog")
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- Загрузка переменных из .env.local ---
function loadEnv() {
  try {
    const envPath = resolve(ROOT, '.env.local');
    const raw = readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };

const API_KEY = env.AIRTABLE_API_KEY;
const BASE_ID = env.AIRTABLE_BASE_ID;
const TABLE_NAME = env.AIRTABLE_TABLE_NAME || 'Catalog';

if (!API_KEY || !BASE_ID) {
  console.error('❌  Не найдены AIRTABLE_API_KEY или AIRTABLE_BASE_ID в .env.local');
  process.exit(1);
}

// --- Загрузка всех записей из Airtable (с пагинацией) ---
async function fetchAllRecords() {
  const records = [];
  let offset = undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`);
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌  Ошибка Airtable API ${res.status}: ${text}`);
      process.exit(1);
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

// --- Трансформация записи Airtable → объект каталога ---
function transformRecord(record) {
  const f = record.fields;

  const parseNotes = (val) =>
    typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const parseVolumes = (f) => {
    const vols = [];
    for (const v of ['2ml', '5ml', '10ml', '50ml', '100ml']) {
      const key = `price_${v}`;
      if (f[key] != null && f[key] !== '') vols.push(v);
    }
    return vols;
  };

  const prices = {};
  for (const v of ['2ml', '5ml', '10ml', '50ml', '100ml']) {
    const val = f[`price_${v}`];
    if (val != null && val !== '') prices[v] = Number(val);
  }

  return {
    id: String(f.id || '').trim(),
    name: String(f.name || '').trim(),
    brand: String(f.brand || '').trim(),
    description: String(f.description || '').trim(),
    notes: {
      top: parseNotes(f.notes_top),
      middle: parseNotes(f.notes_middle),
      base: parseNotes(f.notes_base),
    },
    gender: f.gender || 'унисекс',
    scentType: f.scentType || 'свежий',
    format: f.format || 'распив',
    images: typeof f.images === 'string'
      ? f.images.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    prices,
    availableVolumes: parseVolumes(f),
    featured: Boolean(f.featured),
    newArrival: Boolean(f.newArrival),
    bestseller: Boolean(f.bestseller),
  };
}

// --- Основной поток ---
async function main() {
  console.log(`📡  Загружаем каталог из Airtable (${TABLE_NAME})...`);
  const records = await fetchAllRecords();
  console.log(`✅  Получено записей: ${records.length}`);

  const catalog = records.map(transformRecord).filter((p) => p.id && p.name);

  const outputPath = resolve(ROOT, 'src/data/perfumes.json');
  writeFileSync(outputPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');

  console.log(`💾  Записано в src/data/perfumes.json (${catalog.length} позиций)`);
  console.log('🚀  Готово. Запустите git add/commit и задеплойте.');
}

main().catch((err) => {
  console.error('❌  Непредвиденная ошибка:', err);
  process.exit(1);
});
