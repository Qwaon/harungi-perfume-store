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
