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

/** Инлайн-клавиатура главного меню. */
function mainMenuKeyboard() {
  return { inline_keyboard: [
    [{ text: '➕ Добавить', callback_data: 'm:add' }],
    [{ text: '📋 Список / Редактировать', callback_data: 'm:list' }],
  ] };
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

  // Команды.
  if (msg && msg.text === '/start') return showMenu(userId, env);
  if (msg && msg.text === '/cancel') {
    await clearSession(userId, env);
    return sendMessage(userId, 'Отменено.', env, { reply_markup: mainMenuKeyboard() });
  }

  // Нажатия кнопок.
  if (cq) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id }, env);
    return handleCallback(cq, userId, session, env);
  }

  // Текст/фото в рамках активного диалога.
  if (msg) return handleMessage(msg, userId, session, env);
}

async function showMenu(userId, env) {
  return sendMessage(userId, 'Каталог HARUNGI. Что делаем?', env, { reply_markup: mainMenuKeyboard() });
}

async function handleCallback(cq, userId, session, env) {
  const data = cq.data || '';

  if (data === 'm:add') {
    await saveSession(userId, { flow: 'add', step: 'name', draft: {}, target_id: null }, env);
    return sendMessage(userId, 'Название аромата?', env);
  }

  if (data === 'm:list') {
    const all = await selectPerfumes(env);
    const rows = all.map((p) => [{ text: `${p.brand} — ${p.name}`, callback_data: `pick:${p.id}` }]);
    return sendMessage(userId, 'Выберите аромат:', env, {
      reply_markup: { inline_keyboard: rows.length ? rows : [[{ text: '(пусто)', callback_data: 'noop' }]] },
    });
  }

  if (data.startsWith('pick:')) {
    const id = data.slice(5);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id);
    if (!row) return sendMessage(userId, 'Не найдено.', env);
    return sendMessage(userId, renderCard(row), env, {
      reply_markup: { inline_keyboard: [
        [{ text: '✏️ Изменить', callback_data: `edit:${id}` }, { text: '🗑 Удалить', callback_data: `del:${id}` }],
      ] },
    });
  }

  if (data.startsWith('del:')) {
    const id = data.slice(4);
    return sendMessage(userId, `Удалить ${id}?`, env, {
      reply_markup: { inline_keyboard: [[
        { text: '⚠️ Да, удалить', callback_data: `delyes:${id}` },
        { text: 'Нет', callback_data: 'noop' },
      ]] },
    });
  }

  if (data.startsWith('delyes:')) {
    const id = data.slice(7);
    await deletePerfume(id, env);
    await deleteImages([id], env);  // best-effort: файлы с префиксом id
    return sendMessage(userId, `Удалено: ${id}`, env, { reply_markup: mainMenuKeyboard() });
  }

  if (data.startsWith('edit:')) {
    const id = data.slice(5);
    await saveSession(userId, { flow: 'edit', step: 'pick_field', draft: {}, target_id: id }, env);
    const fields = ['name', 'brand', 'description', 'price_5ml', 'price_10ml', 'inStock', 'featured'];
    const kb = fields.map((f) => [{ text: f, callback_data: `field:${f}` }]);
    return sendMessage(userId, 'Какое поле изменить?', env, { reply_markup: { inline_keyboard: kb } });
  }

  if (data.startsWith('field:') && session && session.flow === 'edit') {
    const field = data.slice(6);
    // Булевы поля переключаем сразу, без запроса значения.
    if (field === 'inStock' || field === 'featured') {
      const all = await selectPerfumes(env);
      const row = all.find((p) => p.id === session.target_id);
      const next = !(row && row[field]);
      await patchPerfume(session.target_id, field, next, env);
      await clearSession(userId, env);
      return sendMessage(userId, `✅ ${field} = ${next}`, env, { reply_markup: mainMenuKeyboard() });
    }
    await saveSession(userId, { step: `editval:${field}` }, env);
    return sendMessage(userId, `Новое значение для ${field}?`, env);
  }

  // Выбор варианта (gender/scentType/format) и Пропустить в потоке add.
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

  return; // noop и неизвестные
}

async function handleMessage(msg, userId, session, env) {
  if (!session) return showMenu(userId, env);

  // Поток edit: ввод нового значения поля.
  if (session.flow === 'edit' && session.step && session.step.startsWith('editval:')) {
    const field = session.step.slice('editval:'.length);
    const v = validateField(field, msg.text);
    if (!v.ok) return sendMessage(userId, `❌ ${v.error}`, env);
    await patchPerfume(session.target_id, field, v.value, env);
    await clearSession(userId, env);
    return sendMessage(userId, `✅ ${field} обновлено`, env, { reply_markup: mainMenuKeyboard() });
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

  return showMenu(userId, env);
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
        { text: '✖️ Отмена', callback_data: 'noop' },
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
