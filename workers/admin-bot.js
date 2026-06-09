// workers/admin-bot.js
// Telegram админ-бот каталога. Запись в Supabase (service_role).
// Изолирован от order-webhook.js. См. docs/superpowers/specs/2026-06-10-admin-bot-design.md

// --- Транслитерация кириллицы для slug ---
const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function translit(str) {
  return str.split('').map((ch) => {
    const lower = ch.toLowerCase();
    const mapped = TRANSLIT[lower];
    return mapped !== undefined ? mapped : ch;
  }).join('');
}

/** brand+name → kebab-id (латиница). */
export function slugify(brand, name) {
  const raw = `${brand} ${name}`;
  return translit(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // всё не-латиница/цифра → дефис
    .replace(/^-+|-+$/g, '')        // обрезать дефисы по краям
    .replace(/-{2,}/g, '-');        // схлопнуть повторы
}

/** Уникальный id: при коллизии с existing (Set) добавляет -2, -3, ... */
export function makeUniqueId(base, existing) {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// --- Допустимые значения single-select (из src/types/index.ts) ---
export const ENUMS = {
  gender: ['мужской', 'женский', 'унисекс'],
  scentType: ['цветочный', 'восточный', 'древесный', 'свежий', 'фужерный', 'шипровый', 'гурманский'],
  format: ['оригинал', 'распив'],
};

const PRICE_STEPS = ['price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original', 'original_volume_ml'];
const REQUIRED_TEXT = ['name', 'brand'];

/** Валидация значения по шагу. → {ok:true,value} | {ok:false,error}. */
export function validateField(step, raw) {
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
    if (!ENUMS[step].includes(value)) return { ok: false, error: 'Выберите вариант кнопкой' };
    return { ok: true, value };
  }

  // description, notes_* — свободный текст, всегда ok
  return { ok: true, value };
}

function csvOrNull(arr) {
  return Array.isArray(arr) && arr.length ? arr.join(', ') : null;
}
function numOrNull(v) {
  return v == null || v === '' ? null : Number(v);
}

/** draft → строка для INSERT/UPSERT в таблицу perfumes (плоские колонки). */
export function draftToPerfumeRow(draft) {
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

// --- FSM потока «Добавить» ---
// Порядок шагов. confirm — финальный (превью + Сохранить).
export const ADD_STEPS = [
  'name', 'brand', 'description', 'gender', 'scentType', 'format',
  'price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original',
  'original_volume_ml', 'notes_top', 'notes_middle', 'notes_base',
  'photos', 'flags', 'confirm',
];

/** Следующий шаг после current, с учётом условных пропусков. */
export function nextAddStep(current, draft) {
  const idx = ADD_STEPS.indexOf(current);
  let next = ADD_STEPS[idx + 1];
  // original_volume_ml спрашиваем только если есть price_original.
  if (next === 'original_volume_ml' && draft.price_original == null) {
    next = ADD_STEPS[idx + 2];
  }
  return next;
}

/**
 * Обработать ввод на шаге add. → { ok, draftPatch, nextStep, error }.
 * При невалидном вводе остаёмся на том же шаге (nextStep === current).
 */
export function advanceAdd(step, raw, draft) {
  const v = validateField(step, raw);
  if (!v.ok) {
    return { ok: false, error: v.error, nextStep: step, draftPatch: {} };
  }
  const draftPatch = { [step]: v.value };
  const merged = { ...draft, ...draftPatch };
  return { ok: true, draftPatch, nextStep: nextAddStep(step, merged) };
}

/** CSV из env → Set<number>. */
export function parseAllowlist(csv) {
  const set = new Set();
  if (!csv) return set;
  for (const part of String(csv).split(',')) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) set.add(n);
  }
  return set;
}

/** Допущен ли user id. Пустой allowlist → false (fail-closed). */
export function isAllowed(userId, allowlistCsv) {
  return parseAllowlist(allowlistCsv).has(Number(userId));
}

// --- Supabase REST/Storage слой (service_role) ---
function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

/** Все ароматы (id для проверки коллизий + список/превью). */
async function selectPerfumes(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/perfumes?select=*`, {
    headers: sbHeaders(env),
  });
  if (!res.ok) throw new Error(`Supabase select ${res.status}`);
  return res.json();
}

/** UPSERT строки аромата. */
async function upsertPerfume(row, env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/perfumes`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase upsert ${res.status}: ${await res.text()}`);
  return res.json();
}

/** PATCH одного поля (поток edit). */
async function patchPerfume(id, field, value, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: sbHeaders(env), body: JSON.stringify({ [field]: value }) }
  );
  if (!res.ok) throw new Error(`Supabase patch ${res.status}`);
  return true;
}

/** DELETE аромата. */
async function deletePerfume(id, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: sbHeaders(env) }
  );
  if (!res.ok) throw new Error(`Supabase delete ${res.status}`);
  return true;
}

/** Загрузка бинарника фото в Storage. → публичный URL. */
async function uploadImage(bytes, contentType, path, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/perfume-images/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': contentType || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: bytes,
    }
  );
  if (!res.ok) throw new Error(`Storage upload ${res.status}: ${await res.text()}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/perfume-images/${path}`;
}

/** Удалить файлы фото аромата по списку путей/префиксов. Best-effort. */
async function deleteImages(paths, env) {
  if (!paths.length) return;
  await fetch(`${env.SUPABASE_URL}/storage/v1/object/perfume-images`, {
    method: 'DELETE',
    headers: sbHeaders(env),
    body: JSON.stringify({ prefixes: paths }),
  }).catch(() => {});
}
