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
