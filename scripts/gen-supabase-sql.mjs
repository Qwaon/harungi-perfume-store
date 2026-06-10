/**
 * gen-supabase-sql.mjs
 *
 * Разовый генератор SQL для миграции каталога Airtable → Supabase (этап 1).
 * Читает src/data/perfumes.json и пишет supabase/001_catalog.sql:
 *   - CREATE TABLE perfumes (схема 1:1 с Airtable, плоские колонки)
 *   - INSERT-ы со всеми позициями
 *   - включение RLS + публичная read-only политика
 *
 * Запуск: node scripts/gen-supabase-sql.mjs
 * Перед запуском освежить данные: npm run sync-catalog
 *
 * ⚠️ Это одноразовый артефакт миграции, не часть рантайма. Схема плоская
 * (без нормализации цен/нот) — намеренно, см. роадмап этап 1.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const catalog = JSON.parse(readFileSync(resolve(ROOT, 'src/data/perfumes.json'), 'utf-8'));

// --- Экранирование строки для SQL ('' для одинарных кавычек, NULL для пустых) ---
function sqlStr(val) {
  if (val == null || val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}
function sqlNum(val) {
  return val == null || val === '' ? 'NULL' : Number(val);
}
function sqlBool(val) {
  return val ? 'true' : 'false';
}
// notes_*/images — CSV-текст (как в Airtable)
function csv(arr) {
  return Array.isArray(arr) && arr.length ? sqlStr(arr.join(', ')) : 'NULL';
}

const SCHEMA = `-- supabase/001_catalog.sql
-- Этап 1 миграции на Supabase: таблица каталога (схема 1:1 с Airtable Catalog).
-- Сгенерировано scripts/gen-supabase-sql.mjs из src/data/perfumes.json.
-- Выполнить целиком в Supabase → SQL Editor → New query → Run.

create table if not exists perfumes (
  id                text primary key,
  name              text not null,
  brand             text,
  description       text,
  notes_top         text,   -- CSV: "нота, нота"
  notes_middle      text,   -- CSV
  notes_base        text,   -- CSV
  gender            text,   -- single select: мужской/женский/унисекс
  "scentType"       text,   -- single select
  format            text,   -- single select: распив/оригинал
  images            text,   -- CSV URL
  price_5ml         numeric,
  price_10ml        numeric,
  price_15ml        numeric,
  price_20ml        numeric,
  price_original    numeric,
  original_volume_ml numeric,
  "inStock"         boolean default true,
  featured          boolean default false,
  "newArrival"      boolean default false,
  bestseller        boolean default false
);

-- Row Level Security: публичный read-only доступ (для anon-ключа сайта).
alter table perfumes enable row level security;

drop policy if exists "public read perfumes" on perfumes;
create policy "public read perfumes"
  on perfumes for select
  to anon, authenticated
  using (true);

-- Заливка данных (idempotent: повторный запуск обновит существующие строки).
`;

const COLS = [
  'id', 'name', 'brand', 'description',
  'notes_top', 'notes_middle', 'notes_base',
  'gender', '"scentType"', 'format', 'images',
  'price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original',
  'original_volume_ml',
  '"inStock"', 'featured', '"newArrival"', 'bestseller',
];

function rowValues(p) {
  const prices = p.prices || {};
  return [
    sqlStr(p.id),
    sqlStr(p.name),
    sqlStr(p.brand),
    sqlStr(p.description),
    csv(p.notes?.top),
    csv(p.notes?.middle),
    csv(p.notes?.base),
    sqlStr(p.gender),
    sqlStr(p.scentType),
    sqlStr(p.format),
    csv(p.images),
    sqlNum(prices['5ml']),
    sqlNum(prices['10ml']),
    sqlNum(prices['15ml']),
    sqlNum(prices['20ml']),
    sqlNum(prices['original']),
    sqlNum(p.originalVolumeMl),
    sqlBool(p.inStock),
    sqlBool(p.featured),
    sqlBool(p.newArrival),
    sqlBool(p.bestseller),
  ].join(', ');
}

const updateCols = COLS.filter((c) => c !== 'id')
  .map((c) => `${c} = excluded.${c}`)
  .join(',\n  ');

const inserts =
  `insert into perfumes (${COLS.join(', ')}) values\n` +
  catalog.map((p) => `  (${rowValues(p)})`).join(',\n') +
  `\non conflict (id) do update set\n  ${updateCols};\n`;

const out = SCHEMA + '\n' + inserts;

mkdirSync(resolve(ROOT, 'supabase'), { recursive: true });
const outPath = resolve(ROOT, 'supabase/001_catalog.sql');
writeFileSync(outPath, out, 'utf-8');

console.log(`✅  Записано ${catalog.length} позиций в supabase/001_catalog.sql`);
console.log('🚀  Открой Supabase → SQL Editor, вставь файл целиком, Run.');
