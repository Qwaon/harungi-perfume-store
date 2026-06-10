# Admin Bot UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Telegram catalog admin bot usable — single-message in-place navigation, Back/Menu buttons, real photo display, persistent commands, paginated list, and full-field editing.

**Architecture:** Refactor `workers/admin-bot.js` around a "screen" concept: each screen is `{ text, reply_markup }` rendered by editing the current menu message (`editMessageText`) instead of sending new ones. The current menu message id is stored in a new `admin_sessions.menu_message_id` column. Photo cards are a special case (Telegram cannot edit text↔photo) — sent as a separate `sendPhoto` message and deleted on navigation away. Pure builder functions (`paginate`, `buildScreen`, keyboards) are unit-tested; network calls are verified manually.

**Tech Stack:** Cloudflare Worker (ES modules), Telegram Bot API, Supabase REST + Storage, `node --test` for pure functions.

---

## File Structure

- `workers/admin-bot.js` — **modify**. Add pure screen/pagination builders near the existing pure helpers (top of file). Add Telegram helpers (`editMessageText`, `deleteMessage`, `sendPhoto`) in the Telegram layer. Rewrite the dispatcher (`handleUpdate`/`handleCallback`/`handleMessage`) to use screens. Keep all existing exported pure functions (`slugify`, `validateField`, `advanceAdd`, `draftToPerfumeRow`, FSM `add`, allowlist) **unchanged in signature**.
- `workers/admin-bot.test.mjs` — **modify**. Add tests for new pure functions (`paginate`, `buildScreen`, `editFieldsKeyboard`). Existing tests stay.
- `supabase/002_admin.sql` — **modify**. Add `menu_message_id bigint` column.
- `CLAUDE.md` — **modify**. Update admin-bot section: single-message navigation, `setMyCommands`, `/add` `/list` commands.

A note on style: the file uses Russian comments, `export function` for testable pure helpers, plain `function`/`async function` for internal ones, and 2-space indent. Match this exactly.

---

## Task 1: DB column for menu message id

**Files:**
- Modify: `supabase/002_admin.sql`

- [ ] **Step 1: Add the column to the schema file**

In `supabase/002_admin.sql`, inside the `create table if not exists admin_sessions (...)` block, add a `menu_message_id` column after `last_update_id` (line 12):

```sql
  last_update_id bigint,                -- idempotency: последний обработанный update_id
  menu_message_id bigint,               -- id меню-сообщения для редактирования на месте (edit-in-place навигация)
  updated_at     timestamptz default now()
```

Also add an idempotent ALTER below the table (for already-deployed DBs), right before the `alter table admin_sessions enable row level security;` line:

```sql
-- Для уже развёрнутых БД (таблица существует) — добавить колонку, если её нет.
alter table admin_sessions add column if not exists menu_message_id bigint;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/002_admin.sql
git commit -m "feat(admin-bot): колонка menu_message_id для edit-in-place навигации

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> Manual deploy note (not part of automated steps): run the ALTER in Supabase SQL Editor before deploying the Worker.

---

## Task 2: `paginate` pure helper

**Files:**
- Modify: `workers/admin-bot.js`
- Test: `workers/admin-bot.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `workers/admin-bot.test.mjs`. First add `paginate` to the import list at the top (line 3-7 import block), then add tests:

```js
test('paginate: первая страница из многих → срез + hasNext, без hasPrev', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const r = paginate(items, 0, 8);
  assert.deepEqual(r.slice, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(r.page, 0);
  assert.equal(r.pages, 3);
  assert.equal(r.hasPrev, false);
  assert.equal(r.hasNext, true);
});

test('paginate: последняя страница → частичный срез, hasPrev, без hasNext', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const r = paginate(items, 2, 8);
  assert.deepEqual(r.slice, [16, 17, 18, 19]);
  assert.equal(r.hasPrev, true);
  assert.equal(r.hasNext, false);
});

test('paginate: страница за пределами → кламп к последней', () => {
  const items = [1, 2, 3];
  const r = paginate(items, 9, 8);
  assert.equal(r.page, 0);
  assert.equal(r.pages, 1);
});

test('paginate: пустой список → 1 страница, пустой срез', () => {
  const r = paginate([], 0, 8);
  assert.deepEqual(r.slice, []);
  assert.equal(r.pages, 1);
  assert.equal(r.hasPrev, false);
  assert.equal(r.hasNext, false);
});
```

Update the import block to include `paginate`:

```js
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  ADD_STEPS, nextAddStep, advanceAdd,
  isAllowed, parseAllowlist,
  paginate,
} from './admin-bot.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test workers/admin-bot.test.mjs`
Expected: FAIL — `paginate` is not exported (`SyntaxError` or `paginate is not a function`).

- [ ] **Step 3: Implement `paginate`**

In `workers/admin-bot.js`, add after `makeUniqueId` (after line 36):

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test workers/admin-bot.test.mjs`
Expected: PASS (all, including the new four).

- [ ] **Step 5: Commit**

```bash
git add workers/admin-bot.js workers/admin-bot.test.mjs
git commit -m "feat(admin-bot): paginate() — постраничный срез списка

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Field metadata + `editFieldsKeyboard` pure helper

This drives the expanded edit menu (all fields, grouped) and tells the dispatcher how to edit each field (text input vs enum choice vs boolean toggle vs photo action).

**Files:**
- Modify: `workers/admin-bot.js`
- Test: `workers/admin-bot.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add `editFieldsKeyboard` and `EDIT_FIELDS` to the import block, then append tests:

```js
test('EDIT_FIELDS: содержит все редактируемые колонки', () => {
  const keys = EDIT_FIELDS.map((f) => f.key);
  for (const k of [
    'name', 'brand', 'description',
    'price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original', 'original_volume_ml',
    'gender', 'scentType', 'format',
    'notes_top', 'notes_middle', 'notes_base',
    'inStock', 'featured', 'newArrival', 'bestseller',
  ]) {
    assert.ok(keys.includes(k), `нет поля ${k}`);
  }
});

test('EDIT_FIELDS: типы полей размечены', () => {
  const byKey = Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, f.kind]));
  assert.equal(byKey.name, 'text');
  assert.equal(byKey.price_5ml, 'text');
  assert.equal(byKey.gender, 'enum');
  assert.equal(byKey.inStock, 'bool');
});

test('editFieldsKeyboard: булевы поля показывают текущее состояние тумблером', () => {
  const kb = editFieldsKeyboard('dior-sauvage', { inStock: true, featured: false });
  const flat = kb.inline_keyboard.flat();
  const inStockBtn = flat.find((b) => b.callback_data === 'efield:dior-sauvage:inStock');
  assert.ok(inStockBtn.text.includes('☑'));
  const featuredBtn = flat.find((b) => b.callback_data === 'efield:dior-sauvage:featured');
  assert.ok(featuredBtn.text.includes('☐'));
});

test('editFieldsKeyboard: содержит управление фото и возврат к карточке', () => {
  const kb = editFieldsKeyboard('x', {});
  const flat = kb.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'ephoto:add:x'));
  assert.ok(flat.some((b) => b.callback_data === 'ephoto:clear:x'));
  assert.ok(flat.some((b) => b.callback_data === 'card:x'));
});
```

Import block becomes:

```js
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  ADD_STEPS, nextAddStep, advanceAdd,
  isAllowed, parseAllowlist,
  paginate, EDIT_FIELDS, editFieldsKeyboard,
} from './admin-bot.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test workers/admin-bot.test.mjs`
Expected: FAIL — `EDIT_FIELDS` / `editFieldsKeyboard` not exported.

- [ ] **Step 3: Implement `EDIT_FIELDS` and `editFieldsKeyboard`**

In `workers/admin-bot.js`, add after the `ENUMS` block (after line 43):

```js
// --- Поля правки существующего аромата ---
// kind: 'text' — ввод значения; 'enum' — выбор кнопкой; 'bool' — тумблер сразу.
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
  { key: 'notes_top', label: 'Верх. ноты', kind: 'text' },
  { key: 'notes_middle', label: 'Сред. ноты', kind: 'text' },
  { key: 'notes_base', label: 'Базов. ноты', kind: 'text' },
  { key: 'inStock', label: 'В наличии', kind: 'bool' },
  { key: 'featured', label: 'Featured', kind: 'bool' },
  { key: 'newArrival', label: 'Новинка', kind: 'bool' },
  { key: 'bestseller', label: 'Хит', kind: 'bool' },
];

/** Клавиатура меню правки: все поля + фото + возврат к карточке. row[] по 2 в ряд. */
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test workers/admin-bot.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/admin-bot.js workers/admin-bot.test.mjs
git commit -m "feat(admin-bot): EDIT_FIELDS + editFieldsKeyboard — правка всех полей

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `buildScreen` for menu and list

Pure builder that returns `{ text, reply_markup }` for the `menu` and `list` screens. The dispatcher will call this and feed the result into `editMessageText`.

**Files:**
- Modify: `workers/admin-bot.js`
- Test: `workers/admin-bot.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add `buildScreen` to the import block, then append:

```js
test('buildScreen menu: текст + кнопки Добавить/Список', () => {
  const s = buildScreen('menu', {});
  assert.match(s.text, /Каталог HARUNGI/);
  const flat = s.reply_markup.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'm:add'));
  assert.ok(flat.some((b) => b.callback_data === 'list:0'));
});

test('buildScreen list: кнопки ароматов + пагинация + В меню', () => {
  const perfumes = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, brand: 'B', name: `N${i}` }));
  const s = buildScreen('list', { perfumes, page: 0 });
  const flat = s.reply_markup.inline_keyboard.flat();
  // 8 кнопок ароматов на первой странице
  const picks = flat.filter((b) => b.callback_data.startsWith('pick:'));
  assert.equal(picks.length, 8);
  // есть «Далее ›», нет «‹ Назад»
  assert.ok(flat.some((b) => b.callback_data === 'list:1'));
  assert.ok(!flat.some((b) => b.callback_data === 'list:-1'));
  // есть «В меню»
  assert.ok(flat.some((b) => b.callback_data === 'm:menu'));
  // счётчик страниц в тексте
  assert.match(s.text, /1\s*\/\s*2/);
});

test('buildScreen list: вторая страница → есть Назад, нет Далее', () => {
  const perfumes = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, brand: 'B', name: `N${i}` }));
  const s = buildScreen('list', { perfumes, page: 1 });
  const flat = s.reply_markup.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'list:0'));
  assert.ok(!flat.some((b) => b.callback_data === 'list:2'));
});

test('buildScreen list: пусто → сообщение и только В меню', () => {
  const s = buildScreen('list', { perfumes: [], page: 0 });
  assert.match(s.text, /пусто/i);
  const flat = s.reply_markup.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'm:menu'));
});
```

Import block:

```js
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  ADD_STEPS, nextAddStep, advanceAdd,
  isAllowed, parseAllowlist,
  paginate, EDIT_FIELDS, editFieldsKeyboard, buildScreen,
} from './admin-bot.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test workers/admin-bot.test.mjs`
Expected: FAIL — `buildScreen` not exported.

- [ ] **Step 3: Implement `buildScreen` (menu + list)**

In `workers/admin-bot.js`, replace the existing `mainMenuKeyboard` function (lines 299-305) with `buildScreen` plus a thin `mainMenuKeyboard` wrapper kept for the success-message keyboards. Add after `editFieldsKeyboard`:

```js
/**
 * Чистый билдер экрана навигации. → { text, reply_markup }.
 * screen: 'menu' | 'list'. (card/editmenu строятся в диспетчере — нужны сетевые данные.)
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test workers/admin-bot.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/admin-bot.js workers/admin-bot.test.mjs
git commit -m "feat(admin-bot): buildScreen() для menu/list + пагинация в клавиатуре

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Telegram helpers — edit, delete, sendPhoto, and a screen renderer

No unit tests (network). Implemented and verified manually in Task 9. This task wires the primitives the dispatcher needs.

**Files:**
- Modify: `workers/admin-bot.js`

- [ ] **Step 1: Add Telegram primitives**

In `workers/admin-bot.js`, in the Telegram API layer after `sendMessage` (after line 297), add:

```js
async function editMessageText(chatId, messageId, text, env, extra = {}) {
  return tg('editMessageText', { chat_id: chatId, message_id: messageId, text, ...extra }, env);
}

async function deleteMessage(chatId, messageId, env) {
  return tg('deleteMessage', { chat_id: chatId, message_id: messageId }, env).catch(() => {});
}

async function sendPhoto(chatId, photo, caption, env, extra = {}) {
  return tg('sendPhoto', { chat_id: chatId, photo, caption, ...extra }, env);
}
```

- [ ] **Step 2: Add `showScreen` — edit-in-place with fallback, tracking `menu_message_id`**

Add after `showMenu` (which we rewrite in Task 6). For now add this helper near the dispatcher helpers (after line 351):

```js
/**
 * Рисует экран навигации, редактируя текущее меню-сообщение (edit-in-place).
 * Если редактировать нечего/нельзя (нет id / старое сообщение) — шлёт новое и
 * запоминает его message_id в сессии. screen/data — для buildScreen.
 */
async function showScreen(userId, session, screen, data, env) {
  const { text, reply_markup } = buildScreen(screen, data);
  const menuId = session && session.menu_message_id;
  if (menuId) {
    const res = await editMessageText(userId, menuId, text, env, { reply_markup });
    if (res.ok) return;
    // не удалось отредактировать (старое/удалённое) — упадём в отправку нового
  }
  const sent = await sendMessage(userId, text, env, { reply_markup });
  const body = await sent.json().catch(() => null);
  const newId = body && body.result && body.result.message_id;
  if (newId) await saveSession(userId, { menu_message_id: newId }, env);
}
```

Note: `tg()` returns the raw `fetch` Response, so `res.ok` is the HTTP status. For `editMessageText` Telegram returns 200 with `{ok:true}` on success and a non-200 on "message not found / not modified", so `res.ok` is a correct success signal here.

- [ ] **Step 3: Quick smoke check that the file still parses**

Run: `node --check workers/admin-bot.js`
Expected: no output (syntax OK).

- [ ] **Step 4: Commit**

```bash
git add workers/admin-bot.js
git commit -m "feat(admin-bot): Telegram helpers editMessageText/deleteMessage/sendPhoto + showScreen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Rewrite dispatcher — commands, menu/list navigation, card with photo

This is the core behavior change. Rewrites `handleUpdate`, `showMenu`, and `handleCallback`'s navigation branches. Edit flow branches are extended in Task 7.

**Files:**
- Modify: `workers/admin-bot.js`

- [ ] **Step 1: Add `/add` and `/list` commands; keep `/start`, `/cancel`**

In `handleUpdate`, replace the command block (lines 332-337):

```js
  // Команды (работают всегда, даже посреди потока).
  if (msg && msg.text === '/start') return showMenu(userId, session, env);
  if (msg && msg.text === '/add') {
    await saveSession(userId, { flow: 'add', step: 'name', draft: {}, target_id: null }, env);
    return sendMessage(userId, 'Название аромата?', env);
  }
  if (msg && msg.text === '/list') return showList(userId, session, 0, env);
  if (msg && msg.text === '/cancel') {
    await clearSession(userId, env);
    return showMenu(userId, null, env);
  }
```

- [ ] **Step 2: Rewrite `showMenu` and add `showList`**

Replace `showMenu` (lines 349-351) with:

```js
async function showMenu(userId, session, env) {
  return showScreen(userId, session, 'menu', {}, env);
}

async function showList(userId, session, page, env) {
  const perfumes = await selectPerfumes(env);
  perfumes.sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'ru'));
  return showScreen(userId, session, 'list', { perfumes, page }, env);
}
```

- [ ] **Step 3: Rewrite navigation branches in `handleCallback`**

Replace the `m:add`, `m:list`, and `pick:` branches (lines 356-379) with:

```js
  if (data === 'm:menu') {
    return showMenu(userId, session, env);
  }

  if (data === 'm:add') {
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
```

- [ ] **Step 4: Add `showCard` — text card edited in place, photo card as separate message**

Add near the other dispatcher helpers (e.g. after `showList`):

```js
/** Кнопки под карточкой аромата. */
function cardKeyboard(id) {
  return { inline_keyboard: [
    [{ text: '✏️ Изменить', callback_data: `editmenu:${id}` }, { text: '🗑 Удалить', callback_data: `del:${id}` }],
    [{ text: '‹ К списку', callback_data: 'list:0' }, { text: '🏠 В меню', callback_data: 'm:menu' }],
  ] };
}

/**
 * Показ карточки. С фото — отдельное photo-сообщение (Telegram не редактирует
 * текст↔фото). Предыдущее меню-сообщение удаляется, id нового — в сессию.
 * Без фото — обычный экран, редактируется на месте.
 */
async function showCard(userId, session, id, env) {
  const all = await selectPerfumes(env);
  const row = all.find((p) => p.id === id);
  if (!row) return showMenu(userId, session, env);

  const firstImage = typeof row.images === 'string' && row.images
    ? row.images.split(',')[0].trim()
    : null;

  if (firstImage) {
    // Удаляем прежнее меню-сообщение и шлём фото-сообщение с карточкой.
    if (session && session.menu_message_id) await deleteMessage(userId, session.menu_message_id, env);
    const sent = await sendPhoto(userId, firstImage, renderCard(row), env, { reply_markup: cardKeyboard(id) });
    const body = await sent.json().catch(() => null);
    const newId = body && body.result && body.result.message_id;
    if (newId) await saveSession(userId, { menu_message_id: newId }, env);
    return;
  }

  // Без фото — текстовая карточка на месте.
  const menuId = session && session.menu_message_id;
  if (menuId) {
    const res = await editMessageText(userId, menuId, renderCard(row), env, { reply_markup: cardKeyboard(id) });
    if (res.ok) return;
  }
  const sent = await sendMessage(userId, renderCard(row), env, { reply_markup: cardKeyboard(id) });
  const body = await sent.json().catch(() => null);
  const newId = body && body.result && body.result.message_id;
  if (newId) await saveSession(userId, { menu_message_id: newId }, env);
}
```

> The photo-card message has `menu_message_id` pointing at a photo message. When the user navigates away (to list/menu/editmenu), `showScreen`'s `editMessageText` will fail on a photo message (can't edit photo→text), and its fallback sends a fresh text message + updates the id. To avoid a leftover photo message, `editmenu`/`del` and the list/menu nav must delete the photo message first — handled in Step 5.

- [ ] **Step 5: Delete stale photo card before drawing a text screen**

The clean rule: whenever we leave a card that *might* be a photo message, delete it first. Wrap the nav branches. Update `m:menu`, `list:`, and (Task 7) `editmenu:`/`del:` to delete the current message first when it could be a photo. Simplest correct approach — add a helper and call it at the top of those branches:

```js
/** Если текущее меню-сообщение — фото-карточка, удалить его перед текстовым экраном. */
async function dropPhotoMessage(userId, session, env) {
  if (session && session.menu_message_id && session._photo) {
    await deleteMessage(userId, session.menu_message_id, env);
    await saveSession(userId, { menu_message_id: null }, env);
    session.menu_message_id = null;
  }
}
```

To know whether the current message is a photo, persist a flag. In `showCard`'s photo branch, change the `saveSession` to also set a marker, and clear it on text screens. Update `showCard` photo branch:

```js
    if (newId) await saveSession(userId, { menu_message_id: newId, draft: { _photo: true } }, env);
```

This collides with `draft` usage. **Cleaner:** store the flag in a dedicated column is overkill; instead detect photo messages structurally — we always delete-then-send for cards, so simply: in `m:menu` and `list:` branches, if coming from a card, the edit will fail and fallback handles it, but leaves the photo. So we DO need a marker.

**Decision (final):** reuse the `step` column as a lightweight UI marker when there's no active flow. Set `step: 'card'` when showing a photo card (only valid when `flow` is null/`view`). In `dropPhotoMessage`, treat `session.step === 'card'` as "current message is a photo".

Replace the photo branch tail in `showCard`:

```js
    if (newId) await saveSession(userId, { menu_message_id: newId, flow: 'view', step: 'card' }, env);
    return;
```

And the text-card tail and `showScreen` should clear that marker. In `showScreen`, after computing a new/edited message, when screen is `menu` or `list`, clear the marker:

```js
  // экран navigation — текущее сообщение точно не фото-карточка
  if (session && session.step === 'card') await saveSession(userId, { flow: null, step: null }, env);
```

Add that line at the **start** of `showScreen` (before editing), and make `dropPhotoMessage`:

```js
async function dropPhotoMessage(userId, session, env) {
  if (session && session.step === 'card' && session.menu_message_id) {
    await deleteMessage(userId, session.menu_message_id, env);
    await saveSession(userId, { menu_message_id: null, flow: null, step: null }, env);
    session.menu_message_id = null;
    session.step = null;
  }
}
```

Call `await dropPhotoMessage(userId, session, env);` at the top of the `m:menu`, `list:`, `editmenu:`, and `del:` branches.

- [ ] **Step 6: Syntax check**

Run: `node --check workers/admin-bot.js`
Expected: no output.

- [ ] **Step 7: Run existing unit tests (must still pass)**

Run: `node --test workers/admin-bot.test.mjs`
Expected: PASS (pure functions untouched).

- [ ] **Step 8: Commit**

```bash
git add workers/admin-bot.js
git commit -m "feat(admin-bot): edit-in-place навигация, /add /list, карточка с фото

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Expanded edit flow (all fields, enum buttons, 4 toggles, photo management)

**Files:**
- Modify: `workers/admin-bot.js`

- [ ] **Step 1: Replace the `edit:` / `field:` branches with the new `editmenu:` / `efield:` / `ephoto:` flow**

Remove the old `edit:` (lines 398-404) and `field:` (lines 406-419) branches. Add:

```js
  if (data.startsWith('editmenu:')) {
    await dropPhotoMessage(userId, session, env);
    const id = data.slice(9);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    await saveSession(userId, { flow: 'edit', step: 'pick_field', draft: {}, target_id: id }, env);
    return showScreen2(userId, userId === userId ? await freshSession(userId, env) : session,
      'Что изменить?', editFieldsKeyboard(id, row), env);
  }
```

That's awkward. **Simplify** — `editmenu` needs to render text+keyboard via edit-in-place too. Add a small generic renderer alongside `showScreen` that takes an explicit text+reply_markup (since `editmenu`/card text isn't from `buildScreen`):

```js
/** Как showScreen, но текст и клавиатура переданы напрямую (для card/editmenu). */
async function showCustom(userId, session, text, reply_markup, env) {
  const menuId = session && session.menu_message_id;
  if (menuId) {
    const res = await editMessageText(userId, menuId, text, env, { reply_markup });
    if (res.ok) return;
  }
  const sent = await sendMessage(userId, text, env, { reply_markup });
  const body = await sent.json().catch(() => null);
  const newId = body && body.result && body.result.message_id;
  if (newId) await saveSession(userId, { menu_message_id: newId }, env);
}
```

Now the `editmenu:` branch:

```js
  if (data.startsWith('editmenu:')) {
    await dropPhotoMessage(userId, session, env);
    const id = data.slice(9);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    const fresh = await getSession(userId, env);  // menu_message_id мог обнулиться в dropPhotoMessage
    await saveSession(userId, { flow: 'edit', step: 'pick_field', draft: {}, target_id: id }, env);
    return showCustom(userId, fresh, 'Что изменить?', editFieldsKeyboard(id, row), env);
  }
```

- [ ] **Step 2: Add `efield:` branch (text → prompt input; enum → choice buttons; bool → toggle now)**

```js
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
      return showCustom(userId, session, `✅ ${meta.label} = ${next ? 'да' : 'нет'}\n\nЧто изменить ещё?`,
        editFieldsKeyboard(id, updated), env);
    }

    if (meta.kind === 'enum') {
      await saveSession(userId, { step: `editval:${field}` }, env);
      const kb = { inline_keyboard: ENUMS[field].map((v) => [{ text: v, callback_data: `eset:${id}:${field}:${v}` }]) };
      return showCustom(userId, session, `${meta.label} — выберите:`, kb, env);
    }

    // text
    await saveSession(userId, { step: `editval:${field}` }, env);
    return sendMessage(userId, `Новое значение — ${meta.label}? (отправьте сообщением)`, env);
  }
```

- [ ] **Step 3: Add `eset:` branch (enum value chosen via button)**

```js
  if (data.startsWith('eset:') && session && session.flow === 'edit') {
    const [, id, field, value] = data.split(':');
    const v = validateField(field, value);
    if (!v.ok) return;
    await patchPerfume(id, field, v.value, env);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    return showCustom(userId, session, `✅ обновлено\n\nЧто изменить ещё?`, editFieldsKeyboard(id, row), env);
  }
```

- [ ] **Step 4: Add `ephoto:` branches (add / clear photo on existing perfume)**

```js
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
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === id) || {};
    return showCustom(userId, session, '✅ Фото очищены.\n\nЧто изменить ещё?', editFieldsKeyboard(id, row), env);
  }
```

- [ ] **Step 5: Update `handleMessage` — edit text input + edit photo upload**

In `handleMessage`, replace the `editval:` block (lines 455-463) so that after saving it returns to the edit menu (not menu, not clearing session):

```js
  // Поток edit: ввод нового текстового значения поля.
  if (session.flow === 'edit' && session.step && session.step.startsWith('editval:')) {
    const field = session.step.slice('editval:'.length);
    const v = validateField(field, msg.text);
    if (!v.ok) return sendMessage(userId, `❌ ${v.error}`, env);
    await patchPerfume(session.target_id, field, v.value, env);
    await saveSession(userId, { step: 'pick_field' }, env);
    const all = await selectPerfumes(env);
    const row = all.find((p) => p.id === session.target_id) || {};
    return showCustom(userId, { ...session, menu_message_id: null }, '✅ обновлено\n\nЧто изменить ещё?',
      editFieldsKeyboard(session.target_id, row), env);
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
```

> Note: text-input replies arrive as a NEW user message, so the bot's reply is a new message anyway — `menu_message_id: null` forces `showCustom` to send fresh and re-track. The previous edit-menu message stays above; acceptable (it's the standard "you typed, bot answers below" flow). The key fix is the session no longer clears, so editing stays in context.

- [ ] **Step 6: Update `del:` and `delyes:` to use screens**

Replace `del:` (lines 381-389) and `delyes:` (lines 391-396):

```js
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
    await deleteImages([id], env);
    await clearSession(userId, env);
    return sendMessage(userId, `🗑 Удалено: ${id}`, env, { reply_markup: mainMenuKeyboard() });
  }
```

- [ ] **Step 7: Update add-flow success + confirm cancel to use screens (cleanup of noop)**

In the `confirm:save` branch (lines 442-447) it already sends menu keyboard — fine. Replace the confirm-cancel `noop` in `stepAdd` (line 505, `callback_data: 'noop'`) with `'m:menu'`, and add handling: the add confirm cancel should clear the draft. Add near the top of `handleCallback`:

```js
  if (data === 'm:menu' && session && session.flow === 'add') {
    await clearSession(userId, env);
    return showMenu(userId, null, env);
  }
```

(Place this BEFORE the generic `m:menu` branch from Task 6 Step 3, or merge: in the generic `m:menu`, if `session.flow === 'add'`, clear first. Simpler — make the generic branch clear any non-view flow:)

```js
  if (data === 'm:menu') {
    if (session && session.flow && session.flow !== 'view') await clearSession(userId, env);
    await dropPhotoMessage(userId, session, env);
    return showMenu(userId, session && session.flow === 'view' ? session : null, env);
  }
```

And change the add-confirm cancel button in `stepAdd` (line 505) from `callback_data: 'noop'` to `callback_data: 'm:menu'`.

- [ ] **Step 8: Syntax + unit tests**

Run: `node --check workers/admin-bot.js && node --test workers/admin-bot.test.mjs`
Expected: no syntax error; all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add workers/admin-bot.js
git commit -m "feat(admin-bot): полная правка (все поля, enum, 4 флага, фото) + чистка noop

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Docs — CLAUDE.md + setMyCommands

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the admin-bot section**

In `CLAUDE.md`, in the «Админ-бот каталога (этап 2)» section, under «Потоки», add a navigation paragraph and the commands setup:

```markdown
- **Навигация:** edit-in-place — бот держит одно меню-сообщение и
  перерисовывает его (`editMessageText`) при переходах (меню → список →
  карточка → правка → назад). `menu_message_id` хранится в `admin_sessions`.
  Список — постранично по 8. Карточка с фото показывается отдельным
  `sendPhoto`-сообщением (Telegram не редактирует текст↔фото) и удаляется при
  уходе. Везде есть «‹ Назад» / «🏠 В меню».
- **Команды (всегда доступны):** `/start` (меню), `/add` (добавить),
  `/list` (список), `/cancel` (сброс). Регистрация в меню «/» — разово:
  `curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/setMyCommands" -H "Content-Type: application/json" -d '{"commands":[{"command":"start","description":"Меню"},{"command":"add","description":"Добавить аромат"},{"command":"list","description":"Список / правка"},{"command":"cancel","description":"Отмена"}]}'`
```

Also update the schema mention to note `menu_message_id` in `admin_sessions`.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: навигация и команды админ-бота в CLAUDE.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Manual verification in Telegram

No code. Deploy the Worker (push triggers Cloudflare if configured, or `wrangler deploy`), run the `setMyCommands` curl, run the `menu_message_id` ALTER in Supabase SQL Editor, then walk the checklist.

- [ ] **Step 1: Apply DB migration**

In Supabase → SQL Editor, run:
```sql
alter table admin_sessions add column if not exists menu_message_id bigint;
```

- [ ] **Step 2: Register commands** — run the `setMyCommands` curl from Task 8.

- [ ] **Step 3: Deploy the Worker** (per existing deploy process for `admin-bot.js`).

- [ ] **Step 4: Checklist in the bot:**
  - `/start` → menu appears. Tap 📋 Список → list replaces the SAME message (no pile-up).
  - With >8 perfumes: «Далее ›» / «‹ Назад» page through, in-place.
  - Tap a perfume → card. If it has a photo, the photo is shown as an image (not "Фото: N"). If photo missing here, the image URL in `images` is broken — inspect the stored URL.
  - On the card: «‹ К списку» returns to list (photo message deleted, no leftover). «🏠 В меню» returns to menu.
  - «✏️ Изменить» → edit menu with ALL fields. Edit a text field (type a value) → returns to edit menu. Toggle each of 4 flags → state flips inline. Change an enum (Пол/Тип/Формат) via buttons.
  - «🖼 Добавить фото» → send a photo → «Готово» → reopen card → photo shows.
  - «🗑 Очистить фото» → card no longer shows a photo.
  - «🗑 Удалить» → confirm screen → «‹ Отмена» returns to card; «⚠️ Да» deletes and returns to menu.
  - `/add` mid-navigation starts add; `/cancel` resets to menu. `/list` mid-flow jumps to list.

- [ ] **Step 5: Report results** — note any checklist item that failed with the observed behavior.

---

## Self-Review Notes

- **Spec coverage:** Problems 1 (edit-in-place: Tasks 5,6), 2 (Back/Menu: Tasks 4,6,7), 3 (photo card: Task 6 + edit photo Task 7), 4 (commands: Tasks 6,8), 5 (pagination: Tasks 2,4), 6 (full edit: Tasks 3,7), 7 (noop cleanup: Task 7) — all mapped.
- **Signatures unchanged:** `slugify`, `validateField`, `advanceAdd`, `draftToPerfumeRow`, `ENUMS`, FSM `add`, allowlist — untouched. New exports: `paginate`, `EDIT_FIELDS`, `editFieldsKeyboard`, `buildScreen`.
- **Naming consistency:** callback prefixes — `m:menu`/`m:add`, `list:<page>`, `pick:`/`card:<id>`, `editmenu:<id>`, `efield:<id>:<field>`, `eset:<id>:<field>:<value>`, `ephoto:add|clear:<id>`, `del:`/`delyes:`. The `step:'card'`+`flow:'view'` marker denotes a photo-card message for `dropPhotoMessage`.
- **Known trade-off:** text-input edits produce a fresh bot message below (not in-place) — inherent to Telegram (user message arrives separately). Documented in Task 7 Step 5.
