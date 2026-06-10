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

/**
 * Срез страницы списка. page клампится в [0, pages-1].
 * → { slice, page, pages, hasPrev, hasNext }.
 */
export function paginate(items, page, size) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(0, page | 0), pages - 1);
  const start = p * size;
  return {
    slice: items.slice(start, start + size),
    page: p,
    pages,
    hasPrev: p > 0,
    hasNext: p < pages - 1,
  };
}

// --- Допустимые значения single-select (из src/types/index.ts) ---
export const ENUMS = {
  gender: ['мужской', 'женский', 'унисекс'],
  scentType: ['цветочный', 'восточный', 'древесный', 'свежий', 'фужерный', 'шипровый', 'гурманский'],
  format: ['оригинал', 'распив'],
};

// Множественный выбор (season/occasion). В БД — CSV-строка; пусто → null, и сайт
// авто-выводит значения из scentType/gender (enrichPerfume в src/data/utils.ts).
export const MULTI_ENUMS = {
  season: ['весна', 'лето', 'осень', 'зима', 'всесезонный'],
  occasion: ['офис', 'вечер', 'ежедневно', 'свидание', 'путешествие'],
};

/** CSV-строка БД ("осень, зима") → массив значений. */
export function parseCsv(val) {
  return typeof val === 'string' && val
    ? val.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
}

/**
 * Клавиатура множественного выбора: чипы с галочкой для выбранных + Готово.
 * callback: mset:<id>:<field>:<value> (тоггл), mdone:<id>:<field> (сохранить и выйти).
 */
export function multiKeyboard(id, field, selected) {
  const values = MULTI_ENUMS[field] || [];
  const sel = new Set(selected);
  const rows = [];
  for (let i = 0; i < values.length; i += 2) {
    rows.push(values.slice(i, i + 2).map((v) => ({
      text: `${sel.has(v) ? '☑' : '☐'} ${v}`,
      callback_data: `mset:${id}:${field}:${v}`,
    })));
  }
  rows.push([{ text: '✅ Готово', callback_data: `mdone:${id}:${field}` }]);
  return { inline_keyboard: rows };
}

const PRICE_STEPS = ['price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original', 'original_volume_ml'];
const REQUIRED_TEXT = ['name', 'brand'];

// --- Поля правки существующего аромата ---
// kind: 'text' — ввод значения; 'enum' — выбор кнопкой; 'bool' — тумблер сразу;
//       'multi' — множественный выбор чипами (season/occasion).
export const EDIT_FIELDS = [
  { key: 'name', label: 'Название', kind: 'text' },
  { key: 'brand', label: 'Бренд', kind: 'text' },
  { key: 'description', label: 'Описание', kind: 'text' },
  { key: 'price_5ml', label: 'Цена 5мл', kind: 'text' },
  { key: 'price_10ml', label: 'Цена 10мл', kind: 'text' },
  { key: 'price_15ml', label: 'Цена 15мл', kind: 'text' },
  { key: 'price_20ml', label: 'Цена 20мл', kind: 'text' },
  { key: 'price_original', label: 'Цена ориг.', kind: 'text' },
  { key: 'original_volume_ml', label: 'Объём ориг.', kind: 'text' },
  { key: 'gender', label: 'Пол', kind: 'enum' },
  { key: 'scentType', label: 'Тип', kind: 'enum' },
  { key: 'format', label: 'Формат', kind: 'enum' },
  { key: 'season', label: 'Сезон', kind: 'multi' },
  { key: 'occasion', label: 'Повод', kind: 'multi' },
  { key: 'notes_top', label: 'Верх. ноты', kind: 'text' },
  { key: 'notes_middle', label: 'Сред. ноты', kind: 'text' },
  { key: 'notes_base', label: 'Базов. ноты', kind: 'text' },
  { key: 'inStock', label: 'В наличии', kind: 'bool' },
  { key: 'featured', label: 'Featured', kind: 'bool' },
  { key: 'newArrival', label: 'Новинка', kind: 'bool' },
  { key: 'bestseller', label: 'Хит', kind: 'bool' },
];

/** Клавиатура меню правки: все поля (по 2 в ряд) + управление фото + возврат к карточке. */
export function editFieldsKeyboard(id, row) {
  const buttons = EDIT_FIELDS.map((f) => {
    if (f.kind === 'bool') {
      const on = Boolean(row[f.key]);
      return { text: `${on ? '☑' : '☐'} ${f.label}`, callback_data: `efield:${id}:${f.key}` };
    }
    return { text: f.label, callback_data: `efield:${id}:${f.key}` };
  });
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  rows.push([
    { text: '🖼 Добавить фото', callback_data: `ephoto:add:${id}` },
    { text: '🗑 Очистить фото', callback_data: `ephoto:clear:${id}` },
  ]);
  rows.push([{ text: '‹ К карточке', callback_data: `card:${id}` }]);
  return { inline_keyboard: rows };
}

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
    season: csvOrNull(draft.season),
    occasion: csvOrNull(draft.occasion),
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

// --- Сессии диалога (таблица admin_sessions) ---
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;  // 24ч — протухание

/** Сессия админа или null. Протухшие (>24ч) считаются отсутствующими. */
async function getSession(userId, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/admin_sessions?tg_user_id=eq.${userId}&select=*`,
    { headers: sbHeaders(env) }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const s = rows[0];
  if (!s) return null;
  if (Date.now() - new Date(s.updated_at).getTime() > SESSION_TTL_MS) return null;
  return s;
}

/**
 * Частичное обновление сессии. PATCH мерджит только переданные колонки —
 * НЕ затирает draft/flow при сохранении одного step (в отличие от POST-upsert,
 * который заменяет строку целиком). Если строки нет — создаёт через POST.
 */
async function saveSession(userId, patch, env) {
  const body = { ...patch, updated_at: new Date().toISOString() };
  const patchRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/admin_sessions?tg_user_id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders(env), Prefer: 'return=representation' },
      body: JSON.stringify(body),
    }
  );
  if (patchRes.ok) {
    const rows = await patchRes.json();
    if (rows.length > 0) return;  // строка существовала, обновлена
  }
  // Строки не было — вставляем.
  await fetch(`${env.SUPABASE_URL}/rest/v1/admin_sessions`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ tg_user_id: userId, ...body }),
  });
}

/** Сброс сессии (после сохранения/отмены). */
async function clearSession(userId, env) {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/admin_sessions?tg_user_id=eq.${userId}`,
    { method: 'DELETE', headers: sbHeaders(env) }
  ).catch(() => {});
}

// --- Telegram API слой ---
async function tg(method, body, env) {
  return fetch(`https://api.telegram.org/bot${env.ADMIN_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendMessage(chatId, text, env, extra = {}) {
  return tg('sendMessage', { chat_id: chatId, text, ...extra }, env);
}

async function editMessageText(chatId, messageId, text, env, extra = {}) {
  return tg('editMessageText', { chat_id: chatId, message_id: messageId, text, ...extra }, env);
}

async function deleteMessage(chatId, messageId, env) {
  return tg('deleteMessage', { chat_id: chatId, message_id: messageId }, env).catch(() => {});
}

async function sendPhoto(chatId, photo, caption, env, extra = {}) {
  return tg('sendPhoto', { chat_id: chatId, photo, caption, ...extra }, env);
}

/** message_id из ответа Telegram (sendMessage/sendPhoto) или null. */
async function messageIdOf(res) {
  const body = await res.json().catch(() => null);
  return (body && body.result && body.result.message_id) || null;
}

/**
 * Чистый билдер экрана навигации. → { text, reply_markup }.
 * screen: 'menu' | 'list'. (card/editmenu строятся отдельно — нужны сетевые данные.)
 */
export function buildScreen(screen, data) {
  if (screen === 'menu') {
    return {
      text: 'Каталог HARUNGI. Что делаем?',
      reply_markup: { inline_keyboard: [
        [{ text: '➕ Добавить', callback_data: 'm:add' }],
        [{ text: '📋 Список / Редактировать', callback_data: 'list:0' }],
      ] },
    };
  }
  if (screen === 'list') {
    const { perfumes, page } = data;
    if (!perfumes.length) {
      return {
        text: 'Каталог пуст. Добавьте первый аромат.',
        reply_markup: { inline_keyboard: [[{ text: '🏠 В меню', callback_data: 'm:menu' }]] },
      };
    }
    const pg = paginate(perfumes, page, 8);
    const rows = pg.slice.map((p) => [{ text: `${p.brand} — ${p.name}`, callback_data: `pick:${p.id}` }]);
    const nav = [];
    if (pg.hasPrev) nav.push({ text: '‹ Назад', callback_data: `list:${pg.page - 1}` });
    if (pg.hasNext) nav.push({ text: 'Далее ›', callback_data: `list:${pg.page + 1}` });
    if (nav.length) rows.push(nav);
    rows.push([{ text: '🏠 В меню', callback_data: 'm:menu' }]);
    return {
      text: `Выберите аромат:  (стр. ${pg.page + 1} / ${pg.pages})`,
      reply_markup: { inline_keyboard: rows },
    };
  }
  throw new Error(`unknown screen: ${screen}`);
}

/** Клавиатура главного меню (для reply_markup после успешного действия). */
function mainMenuKeyboard() {
  return buildScreen('menu', {}).reply_markup;
}

/** Клавиатура выбора из вариантов (gender/scentType/format). callback_data = "v:<значение>". */
function choiceKeyboard(values) {
  return { inline_keyboard: values.map((v) => [{ text: v, callback_data: `v:${v}` }]) };
}

/** Кнопка «Пропустить». */
function skipKeyboard() {
  return { inline_keyboard: [[{ text: '⏭ Пропустить', callback_data: 'skip' }]] };
}

// --- Диспетчер апдейтов ---
async function handleUpdate(update, env) {
  const msg = update.message;
  const cq = update.callback_query;
  const userId = (msg && msg.from.id) || (cq && cq.from.id);

  const session = await getSession(userId, env);

  // Idempotency: дубль апдейта от Telegram — игнорируем.
  if (session && update.update_id && session.last_update_id === update.update_id) return;
  // Запоминаем обработанный update_id (если уже есть сессия).
  if (session && update.update_id) {
    await saveSession(userId, { last_update_id: update.update_id }, env);
  }

  // Команды (работают всегда, даже посреди потока).
  if (msg && msg.text === '/start') return showMenu(userId, session, env);
  if (msg && msg.text === '/add') {
    await dropPhotoMessage(userId, session, env);
    await saveSession(userId, { flow: 'add', step: 'name', draft: {}, target_id: null }, env);
    return sendMessage(userId, 'Название аромата?', env);
  }
  if (msg && msg.text === '/list') return showList(userId, session, 0, env);
  if (msg && msg.text === '/cancel') {
    await dropPhotoMessage(userId, session, env);
    await clearSession(userId, env);
    return showMenu(userId, null, env);
  }

  // Нажатия кнопок.
  if (cq) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id }, env);
    return handleCallback(cq, userId, session, env);
  }

  // Текст/фото в рамках активного диалога.
  if (msg) return handleMessage(msg, userId, session, env);
}

/**
 * Рисует экран навигации (menu/list), редактируя меню-сообщение на месте.
 * Если текущее сообщение — фото-карточка или редактирование не удалось —
 * шлёт новое и сохраняет его id. Сбрасывает флаг menu_is_photo.
 */
async function showScreen(userId, session, screen, data, env) {
  const { text, reply_markup } = buildScreen(screen, data);
  const menuId = session && session.menu_message_id;
  const isPhoto = session && session.menu_is_photo;

  if (menuId && isPhoto) {
    // Фото нельзя превратить в текст — удаляем и шлём новое.
    await deleteMessage(userId, menuId, env);
  } else if (menuId) {
    const res = await editMessageText(userId, menuId, text, env, { reply_markup });
    if (res.ok) {
      if (isPhoto) await saveSession(userId, { menu_is_photo: false }, env);
      return;
    }
  }
  const sent = await sendMessage(userId, text, env, { reply_markup });
  const newId = await messageIdOf(sent);
  await saveSession(userId, { menu_message_id: newId, menu_is_photo: false }, env);
}

/**
 * Рисует произвольный экран (текст+клавиатура заданы напрямую) на месте.
 * Для card-без-фото и editmenu, где текст не из buildScreen.
 */
async function showCustom(userId, session, text, reply_markup, env) {
  const menuId = session && session.menu_message_id;
  const isPhoto = session && session.menu_is_photo;

  if (menuId && isPhoto) {
    await deleteMessage(userId, menuId, env);
  } else if (menuId) {
    const res = await editMessageText(userId, menuId, text, env, { reply_markup });
    if (res.ok) {
      if (isPhoto) await saveSession(userId, { menu_is_photo: false }, env);
      return;
    }
  }
  const sent = await sendMessage(userId, text, env, { reply_markup });
  const newId = await messageIdOf(sent);
  await saveSession(userId, { menu_message_id: newId, menu_is_photo: false }, env);
}

/** Если текущее меню-сообщение — фото-карточка, удалить его (перед текстовым экраном). */
async function dropPhotoMessage(userId, session, env) {
  if (session && session.menu_is_photo && session.menu_message_id) {
    await deleteMessage(userId, session.menu_message_id, env);
    await saveSession(userId, { menu_message_id: null, menu_is_photo: false }, env);
    session.menu_message_id = null;
    session.menu_is_photo = false;
  }
}

async function showMenu(userId, session, env) {
  return showScreen(userId, session, 'menu', {}, env);
}

async function showList(userId, session, page, env) {
  const perfumes = await selectPerfumes(env);
  perfumes.sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'ru'));
  return showScreen(userId, session, 'list', { perfumes, page }, env);
}

/** Кнопки под карточкой аромата. */
function cardKeyboard(id) {
  return { inline_keyboard: [
    [{ text: '✏️ Изменить', callback_data: `editmenu:${id}` }, { text: '🗑 Удалить', callback_data: `del:${id}` }],
    [{ text: '‹ К списку', callback_data: 'list:0' }, { text: '🏠 В меню', callback_data: 'm:menu' }],
  ] };
}

/** Первое фото аромата (или null). images хранится CSV-строкой. */
function firstImageUrl(row) {
  return typeof row.images === 'string' && row.images ? row.images.split(',')[0].trim() : null;
}

/**
 * Показ карточки. С фото — отдельное photo-сообщение (Telegram не редактирует
 * текст↔фото): прежнее меню-сообщение удаляется, ставится флаг menu_is_photo.
 * Без фото — обычный текстовый экран на месте.
 */
async function showCard(userId, session, id, env) {
  const all = await selectPerfumes(env);
  const row = all.find((p) => p.id === id);
  if (!row) return showMenu(userId, session, env);

  const image = firstImageUrl(row);
  if (image) {
    if (session && session.menu_message_id) await deleteMessage(userId, session.menu_message_id, env);
    const sent = await sendPhoto(userId, image, renderCard(row), env, { reply_markup: cardKeyboard(id) });
    const newId = await messageIdOf(sent);
    if (newId) {
      await saveSession(userId, { menu_message_id: newId, menu_is_photo: true }, env);
    } else {
      // sendPhoto не прошёл (битый URL) — покажем текстовую карточку как фолбэк.
      await showCustom(userId, session, `${renderCard(row)}\n\n⚠️ Фото не загрузилось (проверьте ссылку).`, cardKeyboard(id), env);
    }
    return;
  }
  return showCustom(userId, session, renderCard(row), cardKeyboard(id), env);
}

async function handleCallback(cq, userId, session, env) {
  const data = cq.data || '';

  // --- Навигация ---
  if (data === 'm:menu') {
    if (session && session.flow && session.flow !== 'view') await clearSession(userId, env);
    await dropPhotoMessage(userId, session, env);
    return showMenu(userId, session, env);
  }

  if (data === 'm:add') {
    await dropPhotoMessage(userId, session, env);
    await saveSession(userId, { flow: 'add', step: 'name', draft: {}, target_id: null }, env);
    return sendMessage(userId, 'Название аромата?', env);
  }

  if (data.startsWith('list:')) {
    const page = Number(data.slice(5)) || 0;
    return showList(userId, session, page, env);
  }

  if (data.startsWith('pick:') || data.startsWith('card:')) {
    const id = data.slice(5);
    return showCard(userId, session, id, env);
  }

  // --- Удаление ---
  if (data.startsWith('del:')) {
    await dropPhotoMessage(userId, session, env);
    const id = data.slice(4);
    const fresh = await getSession(userId, env);
    return showCustom(userId, fresh, `Удалить «${id}»? Это необратимо.`, { inline_keyboard: [[
      { text: '⚠️ Да, удалить', callback_data: `delyes:${id}` },
      { text: '‹ Отмена', callback_data: `card:${id}` },
    ]] }, env);
  }

  if (data.startsWith('delyes:')) {
    const id = data.slice(7);
    await deletePerfume(id, env);
    await deleteImages([id], env);  // best-effort: файлы с префиксом id
    await clearSession(userId, env);
    return sendMessage(userId, `🗑 Удалено: ${id}`, env, { reply_markup: mainMenuKeyboard() });
  }

  // --- Правка ---
  if (data.startsWith('editmenu:')) {
    await dropPhotoMessage(userId, session, env);
    const id = data.slice(9);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    const fresh = await getSession(userId, env);
    await saveSession(userId, { flow: 'edit', step: 'pick_field', draft: {}, target_id: id }, env);
    return showCustom(userId, fresh, `✏️ ${row.brand || ''} — ${row.name || id}\nЧто изменить?`, editFieldsKeyboard(id, row), env);
  }

  if (data.startsWith('efield:') && session && session.flow === 'edit') {
    const [, id, field] = data.split(':');
    const meta = EDIT_FIELDS.find((f) => f.key === field);
    if (!meta) return;

    if (meta.kind === 'bool') {
      const all = await selectPerfumes(env);
      const row = all.find((p) => p.id === id) || {};
      const next = !row[field];
      await patchPerfume(id, field, next, env);
      const updated = { ...row, [field]: next };
      return showCustom(userId, session, `✅ ${meta.label}: ${next ? 'да' : 'нет'}\nЧто изменить ещё?`,
        editFieldsKeyboard(id, updated), env);
    }

    if (meta.kind === 'enum') {
      await saveSession(userId, { step: `editval:${field}` }, env);
      const kb = { inline_keyboard: [
        ...ENUMS[field].map((v) => [{ text: v, callback_data: `eset:${id}:${field}:${v}` }]),
        [{ text: '‹ Назад', callback_data: `editmenu:${id}` }],
      ] };
      return showCustom(userId, session, `${meta.label} — выберите:`, kb, env);
    }

    if (meta.kind === 'multi') {
      // Текущий выбор берём из БД (CSV) в draft — дальше тоггл идёт по draft.
      const all = await selectPerfumes(env);
      const row = all.find((p) => p.id === id) || {};
      const selected = parseCsv(row[field]);
      await saveSession(userId, { step: `editmulti:${field}`, draft: { ...session.draft, [field]: selected } }, env);
      return showCustom(userId, session,
        `${meta.label} — отметьте (пусто = авто по типу аромата):`,
        multiKeyboard(id, field, selected), env);
    }

    // text — просим ввод сообщением
    await saveSession(userId, { step: `editval:${field}` }, env);
    return sendMessage(userId, `Новое значение — ${meta.label}? Отправьте сообщением.`, env);
  }

  // Тоггл значения в множественном выборе (season/occasion).
  if (data.startsWith('mset:') && session && session.flow === 'edit') {
    const [, id, field, value] = data.split(':');
    if (!MULTI_ENUMS[field]) return;
    const current = Array.isArray(session.draft && session.draft[field]) ? session.draft[field] : [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    await saveSession(userId, { draft: { ...session.draft, [field]: next } }, env);
    const label = EDIT_FIELDS.find((f) => f.key === field)?.label || field;
    return showCustom(userId, session,
      `${label} — отметьте (пусто = авто по типу аромата):`,
      multiKeyboard(id, field, next), env);
  }

  // Сохранить множественный выбор и вернуться в меню правки.
  if (data.startsWith('mdone:') && session && session.flow === 'edit') {
    const [, id, field] = data.split(':');
    if (!MULTI_ENUMS[field]) return;
    const selected = Array.isArray(session.draft && session.draft[field]) ? session.draft[field] : [];
    await patchPerfume(id, field, selected.length ? selected.join(', ') : null, env);
    await saveSession(userId, { step: 'pick_field' }, env);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    const label = EDIT_FIELDS.find((f) => f.key === field)?.label || field;
    const summary = selected.length ? selected.join(', ') : 'авто';
    return showCustom(userId, session, `✅ ${label}: ${summary}\nЧто изменить ещё?`,
      editFieldsKeyboard(id, row), env);
  }

  if (data.startsWith('eset:') && session && session.flow === 'edit') {
    const [, id, field, value] = data.split(':');
    const v = validateField(field, value);
    if (!v.ok) return;
    await patchPerfume(id, field, v.value, env);
    await saveSession(userId, { step: 'pick_field' }, env);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    return showCustom(userId, session, '✅ обновлено\nЧто изменить ещё?', editFieldsKeyboard(id, row), env);
  }

  if (data.startsWith('ephoto:add:') && session && session.flow === 'edit') {
    const id = data.slice('ephoto:add:'.length);
    await saveSession(userId, { step: 'editphoto', target_id: id }, env);
    return sendMessage(userId, 'Пришлите фото (можно несколько). Когда закончите — «Готово».', env, {
      reply_markup: { inline_keyboard: [[{ text: '✅ Готово', callback_data: `editmenu:${id}` }]] },
    });
  }

  if (data.startsWith('ephoto:clear:') && session && session.flow === 'edit') {
    const id = data.slice('ephoto:clear:'.length);
    await patchPerfume(id, 'images', null, env);
    await deleteImages([id], env);
    await saveSession(userId, { step: 'pick_field' }, env);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    return showCustom(userId, session, '✅ Фото очищены.\nЧто изменить ещё?', editFieldsKeyboard(id, row), env);
  }

  // --- Поток add ---
  // Выбор варианта (gender/scentType/format) и Пропустить.
  if ((data.startsWith('v:') || data === 'skip') && session && session.flow === 'add') {
    const value = data === 'skip' ? '' : data.slice(2);
    return stepAdd(userId, session, value, env);
  }

  // Тумблеры флагов в шаге flags.
  if (data.startsWith('flag:') && session && session.flow === 'add') {
    const flag = data.slice(5);
    const draft = { ...session.draft, [flag]: !session.draft[flag] };
    await saveSession(userId, { draft }, env);
    return sendFlagsStep(userId, draft, env);
  }
  if (data === 'flags:done' && session && session.flow === 'add') {
    return stepAdd(userId, { ...session, step: 'flags' }, '', env);
  }

  if (data === 'photos:done' && session && session.flow === 'add') {
    return stepAdd(userId, { ...session, step: 'photos' }, '', env);
  }

  if (data === 'confirm:save' && session && session.flow === 'add') {
    const row = draftToPerfumeRow(session.draft);
    await upsertPerfume(row, env);
    await clearSession(userId, env);
    return sendMessage(userId, `✅ Сохранено: ${row.id}`, env, { reply_markup: mainMenuKeyboard() });
  }

  return; // неизвестные
}

async function handleMessage(msg, userId, session, env) {
  if (!session) return showMenu(userId, null, env);

  // Поток edit: ввод нового текстового значения поля.
  if (session.flow === 'edit' && session.step && session.step.startsWith('editval:')) {
    const field = session.step.slice('editval:'.length);
    const v = validateField(field, msg.text);
    if (!v.ok) return sendMessage(userId, `❌ ${v.error}`, env);
    await patchPerfume(session.target_id, field, v.value, env);
    await saveSession(userId, { step: 'pick_field' }, env);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === session.target_id) || {};
    // Ответ — новое сообщение (юзер только что написал), меню рисуем заново.
    return showCustom(userId, { ...session, menu_message_id: null, menu_is_photo: false },
      '✅ обновлено\nЧто изменить ещё?', editFieldsKeyboard(session.target_id, row), env);
  }

  // Поток edit: загрузка фото к существующему аромату.
  if (session.flow === 'edit' && session.step === 'editphoto' && msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === session.target_id) || {};
    const existing = typeof row.images === 'string' && row.images ? row.images.split(',').map((s) => s.trim()) : [];
    const url = await downloadAndStorePhoto(fileId, { brand: row.brand, name: row.name, images: existing }, env);
    const images = [...existing, url];
    await patchPerfume(session.target_id, 'images', images.join(', '), env);
    return sendMessage(userId, `Фото добавлено (${images.length}). Ещё или «Готово».`, env, {
      reply_markup: { inline_keyboard: [[{ text: '✅ Готово', callback_data: `editmenu:${session.target_id}` }]] },
    });
  }

  // Поток add.
  if (session.flow === 'add') {
    // Шаг фото: принимаем изображения.
    if (session.step === 'photos' && msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;  // самое крупное
      const url = await downloadAndStorePhoto(fileId, session.draft, env);
      const images = [...(session.draft.images || []), url];
      await saveSession(userId, { draft: { ...session.draft, images } }, env);
      return sendMessage(userId, `Фото добавлено (${images.length}). Ещё или «Готово».`, env, {
        reply_markup: { inline_keyboard: [[{ text: '✅ Готово', callback_data: 'photos:done' }]] },
      });
    }
    return stepAdd(userId, session, msg.text, env);
  }

  return showMenu(userId, null, env);
}

/** Обработать значение текущего шага add и спросить следующий. */
async function stepAdd(userId, session, rawValue, env) {
  const step = session.step;
  let draft = session.draft || {};

  // Шаг photos: фото уже накоплены; двигаемся к флагам.
  if (step === 'photos') {
    await saveSession(userId, { step: 'flags' }, env);
    return sendFlagsStep(userId, draft, env);
  }

  // Шаг flags: финализируем id и показываем превью.
  if (step === 'flags') {
    const base = slugify(draft.brand, draft.name);
    const all = await selectPerfumes(env);
    const id = makeUniqueId(base, new Set(all.map((p) => p.id)));
    draft = { ...draft, id };
    await saveSession(userId, { step: 'confirm', draft }, env);
    const row = draftToPerfumeRow(draft);
    return sendMessage(userId, `Проверьте:\n\n${renderCard(row)}`, env, {
      reply_markup: { inline_keyboard: [[
        { text: '✅ Сохранить', callback_data: 'confirm:save' },
        { text: '✖️ Отмена', callback_data: 'm:menu' },
      ]] },
    });
  }

  // Обычные шаги.
  const res = advanceAdd(step, rawValue, draft);
  if (!res.ok) return sendMessage(userId, `❌ ${res.error}`, env);
  draft = { ...draft, ...res.draftPatch };
  await saveSession(userId, { draft, step: res.nextStep }, env);
  return promptStep(userId, res.nextStep, draft, env);
}

/** Текст-приглашение и клавиатура для шага. */
async function promptStep(userId, step, draft, env) {
  const prompts = {
    brand: 'Бренд?',
    description: 'Описание? (или Пропустить)',
    gender: 'Пол:',
    scentType: 'Тип аромата:',
    format: 'Формат:',
    price_5ml: 'Цена 5мл? (число или Пропустить)',
    price_10ml: 'Цена 10мл? (или Пропустить)',
    price_15ml: 'Цена 15мл? (или Пропустить)',
    price_20ml: 'Цена 20мл? (или Пропустить)',
    price_original: 'Цена оригинала? (или Пропустить)',
    original_volume_ml: 'Объём оригинала, мл? (или Пропустить)',
    notes_top: 'Верхние ноты через запятую? (или Пропустить)',
    notes_middle: 'Средние ноты? (или Пропустить)',
    notes_base: 'Базовые ноты? (или Пропустить)',
    photos: 'Пришлите фото (можно несколько), затем «Готово». Или Пропустить.',
  };

  if (ENUMS[step]) {
    return sendMessage(userId, prompts[step], env, { reply_markup: choiceKeyboard(ENUMS[step]) });
  }
  if (step === 'photos') {
    return sendMessage(userId, prompts[step], env, {
      reply_markup: { inline_keyboard: [[
        { text: '✅ Готово', callback_data: 'photos:done' },
        { text: '⏭ Пропустить', callback_data: 'photos:done' },
      ]] },
    });
  }
  if (step === 'flags') {
    return sendFlagsStep(userId, draft, env);
  }
  // текстовые/ценовые шаги — с кнопкой Пропустить, кроме обязательных (brand)
  const required = ['brand'];
  const extra = required.includes(step) ? {} : { reply_markup: skipKeyboard() };
  return sendMessage(userId, prompts[step] || `${step}?`, env, extra);
}

/** Клавиатура тумблеров флагов. */
async function sendFlagsStep(userId, draft, env) {
  const flag = (key, label) => ({
    text: `${draft[key] ? '☑' : '☐'} ${label}`,
    callback_data: `flag:${key}`,
  });
  return sendMessage(userId, 'Флаги (тап — переключить):', env, {
    reply_markup: { inline_keyboard: [
      [flag('inStock', 'В наличии'), flag('featured', 'Featured')],
      [flag('newArrival', 'Новинка'), flag('bestseller', 'Хит')],
      [{ text: '✅ Далее', callback_data: 'flags:done' }],
    ] },
  });
}

/** Скачать фото из Telegram и залить в Storage. → публичный URL. */
async function downloadAndStorePhoto(fileId, draft, env) {
  const fileRes = await fetch(`https://api.telegram.org/bot${env.ADMIN_BOT_TOKEN}/getFile?file_id=${fileId}`);
  const fileData = await fileRes.json();
  const path = fileData.result.file_path;
  const binRes = await fetch(`https://api.telegram.org/file/bot${env.ADMIN_BOT_TOKEN}/${path}`);
  const bytes = await binRes.arrayBuffer();
  const base = slugify(draft.brand || 'x', draft.name || 'x');
  const n = (draft.images || []).length + 1;
  return uploadImage(bytes, 'image/jpeg', `${base}-${n}.jpg`, env);
}

/** Рендер карточки аромата (превью как на сайте). */
function renderCard(row) {
  const lines = [
    `${row.brand} — ${row.name}`,
    row.description || '',
    '',
    `Пол: ${row.gender || '—'}  Тип: ${row.scentType || '—'}  Формат: ${row.format || '—'}`,
  ];
  const priceLabels = [
    ['price_5ml', '5'], ['price_10ml', '10'], ['price_15ml', '15'],
    ['price_20ml', '20'], ['price_original', 'ориг'],
  ];
  const prices = priceLabels
    .filter(([key]) => row[key] != null)
    .map(([key, label]) => `${label}: ${row[key]}₽`);
  if (prices.length) lines.push(`Цены: ${prices.join('  ')}`);
  // season/occasion: показываем ручные значения, иначе «авто».
  lines.push(`Сезон: ${row.season || 'авто'}  Повод: ${row.occasion || 'авто'}`);
  const flags = ['inStock', 'featured', 'newArrival', 'bestseller'].filter((f) => row[f]);
  if (flags.length) lines.push(`Флаги: ${flags.join(', ')}`);
  const imgCount = (typeof row.images === 'string' && row.images ? row.images.split(',').length : (row.images || []).length);
  if (imgCount) lines.push(`Фото: ${imgCount}`);
  return lines.filter((l) => l !== '').join('\n');
}

// --- Точка входа Worker ---
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('ok');

    // Защита: webhook-секрет (задаётся при setWebhook).
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (env.ADMIN_WEBHOOK_SECRET && secret !== env.ADMIN_WEBHOOK_SECRET) {
      return new Response('unauthorized', { status: 401 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('ok');
    }

    const msg = update.message;
    const cq = update.callback_query;
    const from = (msg && msg.from) || (cq && cq.from);
    if (!from) return new Response('ok');

    // Allowlist: чужих молча игнорируем.
    if (!isAllowed(from.id, env.ADMIN_USER_IDS)) return new Response('ok');

    try {
      await handleUpdate(update, env);
    } catch (e) {
      // Сообщаем админу; draft в сессии сохранён (если был).
      await sendMessage(from.id, `⚠️ Ошибка: ${e.message}. Попробуйте ещё раз.`, env).catch(() => {});
    }
    return new Response('ok');
  },
};
