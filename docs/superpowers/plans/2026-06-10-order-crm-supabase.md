# Order CRM → Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести приём заказов и историю с Airtable + CloudStorage на Supabase: нормализованные `orders` + `order_items`, безопасное чтение истории в Mini App через проверку Telegram initData.

**Architecture:** Боевой `workers/order-webhook.js` меняет слой хранения (Airtable → Supabase REST), сохраняя Telegram-часть и фолбэк. Новый маршрут `POST /history` проверяет HMAC-подпись initData и отдаёт заказы по проверенному `tgUserId`. Клиентский `lib/orderHistory.ts` читает из `/history` вместо CloudStorage; запись истории (`appendOrder`) удаляется. Чистые функции покрыты `node --test`.

**Tech Stack:** Cloudflare Workers (`fetch`, Web Crypto `crypto.subtle`), Supabase REST, Telegram Bot API + Web App initData (HMAC-SHA256), `node --test`.

**Спека:** `docs/superpowers/specs/2026-06-10-order-crm-supabase-design.md`
**Образцы:** `workers/order-webhook.js` (текущий), `workers/admin-bot.js` (Supabase-слой, тесты).

---

## File Structure

- **Create `supabase/003_orders.sql`** — таблицы `orders` + `order_items`, RLS.
- **Modify `workers/order-webhook.js`** — Supabase-слой вместо Airtable, маршрут `/history`, чистые функции (экспорт для тестов).
- **Create `workers/order-webhook.test.mjs`** — `node --test` для чистых функций.
- **Modify `src/lib/orderHistory.ts`** — чтение из `/history`, удаление `appendOrder`.
- **Modify `src/components/OrderModal.tsx`** — убрать вызовы `appendOrder`.
- **Modify `src/components/CartCheckoutModal.tsx`** — убрать вызовы `appendOrder`.
- **Modify `src/components/account/OrderHistory.tsx`** — передавать `initData` в `readOrders`.

`order-webhook.js` экспортирует чистые функции именованно (для теста) и `export default { fetch }`. Сейчас файл использует `export default` — добавляем именованные `export` к выносимым функциям.

---

## Task 1: SQL-миграция (orders + order_items)

**Files:**
- Create: `supabase/003_orders.sql`

- [ ] **Step 1: Создать файл миграции**

Create `supabase/003_orders.sql`:

```sql
-- supabase/003_orders.sql
-- Этап 3 миграции: заказы (нормализованно). Выполнить в Supabase → SQL Editor → Run.

create table if not exists orders (
  id            bigint generated always as identity primary key,
  order_number  bigint generated always as identity,  -- человекочитаемый (аналог Airtable Autonumber)
  status        text not null default 'new',          -- new/accepted/shipped/done/canceled
  customer_name text,
  contact       text,
  total         numeric,
  type          text,                                 -- single/cart/consultation
  source        text,
  page_url      text,
  tg_user_id    bigint,                               -- для истории Mini App
  note          text,
  created_at    timestamptz default now()
);

create table if not exists order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references orders(id) on delete cascade,
  perfume_id   text references perfumes(id) on delete set null,  -- мягкая ссылка
  perfume_name text,
  brand        text,
  volume       text,
  quantity     int default 1,
  price        numeric
);

create index if not exists orders_tg_user_id_idx on orders(tg_user_id);
create index if not exists order_items_order_id_idx on order_items(order_id);

-- RLS: обе таблицы включены БЕЗ публичных политик — доступ только service_role (Worker).
alter table orders enable row level security;
alter table order_items enable row level security;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/003_orders.sql
git commit -m "feat(order-crm): SQL-миграция orders + order_items"
```

---

## Task 2: parseStatusCallback (чистая функция + тесты)

Разбор `callback_data` кнопки статуса. Сейчас логика инлайнится в `handleTelegramCallback` — выносим в тестируемую функцию.

**Files:**
- Create: `workers/order-webhook.test.mjs`
- Modify: `workers/order-webhook.js`

- [ ] **Step 1: Написать падающий тест**

Create `workers/order-webhook.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatusCallback } from './order-webhook.js';

test('parseStatusCallback: валидный s:42:accepted', () => {
  assert.deepEqual(parseStatusCallback('s:42:accepted'), { id: '42', status: 'accepted' });
});

test('parseStatusCallback: не наш префикс → null', () => {
  assert.equal(parseStatusCallback('x:42:accepted'), null);
});

test('parseStatusCallback: неизвестный статус → null', () => {
  assert.equal(parseStatusCallback('s:42:bogus'), null);
});

test('parseStatusCallback: нет id → null', () => {
  assert.equal(parseStatusCallback('s::accepted'), null);
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --test workers/order-webhook.test.mjs`
Expected: FAIL — `parseStatusCallback is not a function`.

- [ ] **Step 3: Реализовать**

В `workers/order-webhook.js`, после объявления `STATUS_LABELS` (верх файла), добавить:

```javascript
/** Разбор callback_data "s:<id>:<status>". → {id,status} | null. */
export function parseStatusCallback(data) {
  if (typeof data !== 'string' || !data.startsWith('s:')) return null;
  const parts = data.split(':');
  const id = parts[1];
  const status = parts[2];
  if (!id || !STATUS_LABELS[status]) return null;
  return { id, status };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `node --test workers/order-webhook.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Заменить инлайн-разбор в handleTelegramCallback на функцию**

В `workers/order-webhook.js`, в `handleTelegramCallback`, заменить блок:

```javascript
  // callback_data = "s:<recordId>:<status>"
  const parts = cq.data.split(':');
  const recordId = parts[1];
  const status = parts[2];
  const label = STATUS_LABELS[status];

  if (!recordId || !label) {
    await answerCallback(cq.id, 'Неизвестный статус', env);
    return new Response('ok');
  }
```

на:

```javascript
  const parsed = parseStatusCallback(cq.data);
  if (!parsed) {
    await answerCallback(cq.id, 'Неизвестный статус', env);
    return new Response('ok');
  }
  const recordId = parsed.id;
  const status = parsed.status;
  const label = STATUS_LABELS[status];
```

Также обновить ранний выход выше (проверку `cq.data.startsWith('s:')`) — оставить как есть, он совместим.

- [ ] **Step 6: Запустить тесты — всё ещё проходят**

Run: `node --test workers/order-webhook.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add workers/order-webhook.js workers/order-webhook.test.mjs
git commit -m "feat(order-crm): parseStatusCallback с тестами"
```

---

## Task 3: buildOrderRows (чистая функция + тесты)

Маппинг payload (single/cart/consultation) в строки `orders` + `order_items`.

**Files:**
- Modify: `workers/order-webhook.js`
- Modify: `workers/order-webhook.test.mjs`

- [ ] **Step 1: Добавить падающие тесты**

Append to `workers/order-webhook.test.mjs`:

```javascript
import { buildOrderRows } from './order-webhook.js';

test('buildOrderRows: одиночный заказ', () => {
  const payload = {
    name: 'Иван', contact: '@ivan', type: 'single', messageType: 'order',
    perfumeId: 'dior-sauvage', perfumeName: 'Sauvage', brand: 'Dior',
    volume: '5ml', volumeLabel: '5 мл', price: 650,
    source: 'site', pageUrl: 'https://x/p', tgUserId: '111',
  };
  const { order, items } = buildOrderRows(payload);
  assert.equal(order.customer_name, 'Иван');
  assert.equal(order.type, 'single');
  assert.equal(order.total, 650);
  assert.equal(order.tg_user_id, 111);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    perfume_id: 'dior-sauvage', perfume_name: 'Sauvage', brand: 'Dior',
    volume: '5 мл', quantity: 1, price: 650,
  });
});

test('buildOrderRows: заказ-корзина с количеством', () => {
  const payload = {
    name: 'Пётр', contact: '+79990001122', type: 'cart',
    items: [
      { perfumeId: 'a', perfumeName: 'A', brand: 'BrA', volume: '5ml', volumeLabel: '5 мл', price: 100, quantity: 2 },
      { perfumeId: 'b', perfumeName: 'B', brand: 'BrB', volume: '10ml', volumeLabel: '10 мл', price: 300, quantity: 1 },
    ],
    total: 500, source: 'tg', pageUrl: 'https://x/cart',
  };
  const { order, items } = buildOrderRows(payload);
  assert.equal(order.type, 'cart');
  assert.equal(order.total, 500);
  assert.equal(order.tg_user_id, null);   // нет tgUserId
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[1].price, 300);
});

test('buildOrderRows: консультация → type consultation', () => {
  const payload = {
    name: 'Анна', contact: '@anna', type: 'consultation', messageType: 'consultation',
    perfumeId: 'x', perfumeName: 'X', brand: 'Br', volume: '5ml', volumeLabel: '5 мл', price: 0,
    source: 'site', pageUrl: 'https://x',
  };
  const { order } = buildOrderRows(payload);
  assert.equal(order.type, 'consultation');
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --test workers/order-webhook.test.mjs`
Expected: FAIL — `buildOrderRows is not a function`.

- [ ] **Step 3: Реализовать**

В `workers/order-webhook.js`, добавить (рядом с другими экспортами, например после `parseStatusCallback`):

```javascript
/**
 * payload (single/cart/consultation) → { order, items }.
 * order — строка для таблицы orders; items — массив строк order_items (снимок).
 */
export function buildOrderRows(payload) {
  const isCart = Array.isArray(payload.items);
  const tgUserId = payload.tgUserId != null && payload.tgUserId !== ''
    ? Number(payload.tgUserId) : null;

  let items;
  let total;
  let type;

  if (isCart) {
    items = payload.items.map((i) => ({
      perfume_id: i.perfumeId,
      perfume_name: i.perfumeName,
      brand: i.brand,
      volume: i.volumeLabel || i.volume,
      quantity: i.quantity || 1,
      price: Number(i.price),
    }));
    total = Number(payload.total);
    type = 'cart';
  } else {
    items = [{
      perfume_id: payload.perfumeId,
      perfume_name: payload.perfumeName,
      brand: payload.brand,
      volume: payload.volumeLabel || payload.volume,
      quantity: 1,
      price: Number(payload.price),
    }];
    total = Number(payload.price);
    type = payload.type || (payload.messageType === 'consultation' ? 'consultation' : 'single');
  }

  const order = {
    status: 'new',
    customer_name: String(payload.name),
    contact: String(payload.contact),
    total,
    type,
    source: String(payload.source || ''),
    page_url: String(payload.pageUrl || ''),
    tg_user_id: tgUserId,
  };

  return { order, items };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `node --test workers/order-webhook.test.mjs`
Expected: PASS (7 tests total).

- [ ] **Step 5: Commit**

```bash
git add workers/order-webhook.js workers/order-webhook.test.mjs
git commit -m "feat(order-crm): buildOrderRows с тестами"
```

---

## Task 4: verifyInitData (чистая функция + тесты)

Проверка HMAC-подписи Telegram Web App initData. Самая критичная функция — защита истории.

**Files:**
- Modify: `workers/order-webhook.js`
- Modify: `workers/order-webhook.test.mjs`

- [ ] **Step 1: Добавить тест с самогенерируемой фикстурой**

Фикстуру (валидный initData) вычисляем тем же алгоритмом в setup-блоке теста —
доковый пример Telegram использует другой токен и не сойдётся. Append to
`workers/order-webhook.test.mjs`:

```javascript
import { verifyInitData } from './order-webhook.js';

// Хелпер: собрать валидный initData с правильным hash (схема Telegram Web App).
async function makeInitData(botToken, userId, authDate) {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('user', JSON.stringify({ id: userId, first_name: 'Test' }));
  // data_check_string: пары key=value (кроме hash), отсортированы, через \n.
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort();
  const dcs = pairs.join('\n');
  const enc = new TextEncoder();
  // secret = HMAC_SHA256(key="WebAppData", message=botToken)
  const secretKey = await crypto.subtle.importKey('raw', enc.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', secretKey, enc.encode(botToken));
  // hash = HMAC_SHA256(key=secret, message=dcs)
  const hk = await crypto.subtle.importKey('raw', secret,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', hk, enc.encode(dcs));
  const hashHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  params.set('hash', hashHex);
  return params.toString();
}

const BOT = '123456:TESTTOKEN';

test('verifyInitData: валидная подпись → ok + userId', async () => {
  const now = Math.floor(Date.now() / 1000);
  const initData = await makeInitData(BOT, 777, now);
  const res = await verifyInitData(initData, BOT);
  assert.equal(res.ok, true);
  assert.equal(res.userId, 777);
});

test('verifyInitData: искажённый hash → fail', async () => {
  const now = Math.floor(Date.now() / 1000);
  let initData = await makeInitData(BOT, 777, now);
  initData = initData.replace(/hash=[a-f0-9]+/, 'hash=deadbeef');
  const res = await verifyInitData(initData, BOT);
  assert.equal(res.ok, false);
});

test('verifyInitData: чужой токен → fail', async () => {
  const now = Math.floor(Date.now() / 1000);
  const initData = await makeInitData(BOT, 777, now);
  const res = await verifyInitData(initData, 'другой:токен');
  assert.equal(res.ok, false);
});

test('verifyInitData: протухший auth_date → fail', async () => {
  const old = Math.floor(Date.now() / 1000) - 25 * 60 * 60;  // 25ч назад
  const initData = await makeInitData(BOT, 777, old);
  const res = await verifyInitData(initData, BOT);
  assert.equal(res.ok, false);
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --test workers/order-webhook.test.mjs`
Expected: FAIL — `verifyInitData is not a function`.

- [ ] **Step 3: Реализовать**

В `workers/order-webhook.js` добавить:

```javascript
const INITDATA_TTL_SEC = 24 * 60 * 60;  // 24ч — защита от реиграния

async function hmacSha256(keyBytes, msgStr) {
  const key = await crypto.subtle.importKey('raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msgStr)));
}

/**
 * Проверка подписи Telegram Web App initData.
 * → { ok:true, userId } при валидной свежей подписи, иначе { ok:false }.
 */
export async function verifyInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { ok: false };

    // data_check_string: все пары кроме hash, key=value, отсортированы, через \n.
    const pairs = [];
    for (const [k, v] of params.entries()) {
      if (k !== 'hash') pairs.push(`${k}=${v}`);
    }
    pairs.sort();
    const dcs = pairs.join('\n');

    const enc = new TextEncoder();
    const secret = await hmacSha256(enc.encode('WebAppData'), botToken);
    const sig = await hmacSha256(secret, dcs);
    const sigHex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (sigHex !== hash) return { ok: false };

    // Свежесть.
    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate)) return { ok: false };
    if (Math.floor(Date.now() / 1000) - authDate > INITDATA_TTL_SEC) return { ok: false };

    const user = JSON.parse(params.get('user') || '{}');
    if (!user.id) return { ok: false };
    return { ok: true, userId: Number(user.id) };
  } catch {
    return { ok: false };
  }
}
```

Примечание: `hmacSha256` принимает первый аргумент как `keyBytes` (Uint8Array/ArrayBuffer) — `secret` уже Uint8Array, подходит напрямую.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `node --test workers/order-webhook.test.mjs`
Expected: PASS (11 tests total).

- [ ] **Step 5: Commit**

```bash
git add workers/order-webhook.js workers/order-webhook.test.mjs
git commit -m "feat(order-crm): verifyInitData (HMAC Telegram) с тестами"
```

---

## Task 5: Supabase-слой заказов (сетевые функции)

Замена Airtable create/patch на Supabase. Без unit-тестов (сеть).

**Files:**
- Modify: `workers/order-webhook.js`

- [ ] **Step 1: Реализовать createSupabaseOrder и patchSupabaseStatus**

В `workers/order-webhook.js` добавить (рядом, заменяя роль `createAirtableOrder`/`patchAirtableStatus`):

```javascript
function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Создаёт заказ в Supabase: orders → order_items.
 * → { id, orderNumber } или null при сбое (фолбэк: заказ всё равно уйдёт в чат).
 */
async function createSupabaseOrder(payload, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null;
  try {
    const { order, items } = buildOrderRows(payload);
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: { ...sbHeaders(env), Prefer: 'return=representation' },
      body: JSON.stringify(order),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const created = rows[0];
    if (!created) return null;

    // Позиции — одним запросом массивом. Частичный сбой не откатывает заказ.
    const itemRows = items.map((it) => ({ ...it, order_id: created.id }));
    await fetch(`${env.SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: sbHeaders(env),
      body: JSON.stringify(itemRows),
    }).catch(() => {});  // best-effort

    return { id: created.id, orderNumber: created.order_number };
  } catch {
    return null;
  }
}

/** PATCH статуса заказа в Supabase. true при успехе. */
async function patchSupabaseStatus(id, status, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return false;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: sbHeaders(env),
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Переключить handleOrder на createSupabaseOrder**

В `handleOrder`, заменить:

```javascript
    // Создаём запись в Airtable (источник правды по статусу).
    const order = await createAirtableOrder(payload, env);
```

на:

```javascript
    // Создаём запись в Supabase (источник правды по статусу).
    const order = await createSupabaseOrder(payload, env);
```

И заменить использование `order.recordId` на `order.id` в формировании клавиатуры:

```javascript
    if (order && order.id) {
      sendBody.reply_markup = statusKeyboard(order.id);
    }
```

- [ ] **Step 3: Переключить handleTelegramCallback на patchSupabaseStatus**

В `handleTelegramCallback`, заменить:

```javascript
  const patched = await patchAirtableStatus(recordId, status, env);
```

на:

```javascript
  const patched = await patchSupabaseStatus(recordId, status, env);
```

- [ ] **Step 4: Удалить createAirtableOrder и patchAirtableStatus**

Удалить функции `createAirtableOrder` и `patchAirtableStatus` целиком (больше не используются).

- [ ] **Step 5: Проверить тесты и синтаксис**

Run: `node --test workers/order-webhook.test.mjs && node --check workers/order-webhook.js`
Expected: PASS (11 tests) + синтаксис ок.

- [ ] **Step 6: Commit**

```bash
git add workers/order-webhook.js
git commit -m "feat(order-crm): Supabase-слой заказов вместо Airtable"
```

---

## Task 6: Маршрут /history (чтение истории)

Новый маршрут: проверка initData → заказы по tgUserId.

**Files:**
- Modify: `workers/order-webhook.js`

- [ ] **Step 1: Реализовать selectOrdersByUser и handleHistory**

В `workers/order-webhook.js` добавить:

```javascript
/** Заказы пользователя с позициями (вложенно через PostgREST embed). */
async function selectOrdersByUser(tgUserId, env) {
  const url = `${env.SUPABASE_URL}/rest/v1/orders` +
    `?tg_user_id=eq.${tgUserId}&select=*,order_items(*)&order=created_at.desc`;
  const res = await fetch(url, { headers: sbHeaders(env) });
  if (!res.ok) throw new Error(`Supabase history ${res.status}`);
  return res.json();
}

/** POST /history: { initData } → заказы пользователя. */
async function handleHistory(request, env, allowedOrigin) {
  try {
    const body = await request.json();
    const verified = await verifyInitData(body.initData || '', env.TELEGRAM_BOT_TOKEN);
    if (!verified.ok) {
      return json({ ok: false, error: 'unauthorized' }, 401, allowedOrigin);
    }
    const orders = await selectOrdersByUser(verified.userId, env);
    return json({ ok: true, orders }, 200, allowedOrigin);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'error' }, 500, allowedOrigin);
  }
}
```

- [ ] **Step 2: Подключить маршрут в fetch handler**

В `export default { fetch }`, после блока маршрута `/tg`, добавить маршрут `/history`:

```javascript
    // История заказов Mini App (проверка initData).
    if (url.pathname === '/history' && request.method === 'POST') {
      return handleHistory(request, env, allowedOrigin);
    }
```

- [ ] **Step 3: Разрешить заголовок и метод для CORS (если нужно)**

В `corsHeaders` метод `POST` уже разрешён. Заголовок `Content-Type` тоже. Изменений не требуется — шаг проверки.

- [ ] **Step 4: Проверить тесты и синтаксис**

Run: `node --test workers/order-webhook.test.mjs && node --check workers/order-webhook.js`
Expected: PASS (11 tests) + синтаксис ок.

- [ ] **Step 5: Commit**

```bash
git add workers/order-webhook.js
git commit -m "feat(order-crm): маршрут /history с проверкой initData"
```

---

## Task 7: Клиент — чтение истории из /history

Переписать `lib/orderHistory.ts` на чтение из Worker'а, удалить запись.

**Files:**
- Modify: `src/lib/orderHistory.ts`
- Modify: `src/components/account/OrderHistory.tsx`

- [ ] **Step 1: Переписать orderHistory.ts**

Заменить содержимое `src/lib/orderHistory.ts`:

```typescript
// src/lib/orderHistory.ts
'use client';

export interface OrderItem {
  perfume_id: string | null;
  perfume_name: string;
  brand: string;
  volume: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  order_number: number;
  status: string;
  total: number;
  type: string;
  created_at: string;
  order_items: OrderItem[];
}

const WEBHOOK_URL = process.env.NEXT_PUBLIC_ORDER_WEBHOOK_URL;

/**
 * История заказов из Supabase через Worker. initData — подписанная строка
 * Telegram (window.Telegram.WebApp.initData), Worker проверит подпись.
 * Никогда не бросает: при сбое возвращает [].
 */
export async function readOrders(initData: string): Promise<Order[]> {
  if (!WEBHOOK_URL || !initData) return [];
  try {
    const res = await fetch(`${WEBHOOK_URL}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.orders) ? data.orders : [];
  } catch {
    return [];
  }
}
```

(`appendOrder`, `StoredOrder`, `StoredOrderItem` удалены — история теперь из базы.)

- [ ] **Step 2: Обновить OrderHistory.tsx под новый readOrders и тип Order**

Прочитать `src/components/account/OrderHistory.tsx` целиком, затем адаптировать:
- импорт: `import { readOrders, Order } from '@/lib/orderHistory';`
- получить `initData`: из `useTelegram()` контекста (если контекст его отдаёт) или
  напрямую `window.Telegram?.WebApp?.initData`. Использовать прямой доступ:
  ```typescript
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData ?? '' : '';
  useEffect(() => {
    readOrders(initData).then(setOrders);
  }, [initData]);
  ```
- состояние: `const [orders, setOrders] = useState<Order[]>([]);`
- рендер: использовать поля нового типа (`order.order_number`, `order.status`,
  `order.total`, `order.order_items[].perfume_name`/`.volume`/`.quantity`/`.price`).
  Заменить прежний рендер `StoredOrder` (`o.items` как кортежи) на `order.order_items`
  (объекты). Показать статус и номер заказа.

Точную вёрстку адаптировать под существующую разметку файла (сохранить классы/стили).

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: компиляция и проверка типов проходят (no type errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/orderHistory.ts src/components/account/OrderHistory.tsx
git commit -m "feat(order-crm): история Mini App из Supabase через /history"
```

---

## Task 8: Убрать запись истории (appendOrder) из модалок

`appendOrder` удалён — убираем его вызовы. Заказ уже сохраняется в Supabase через webhook.

**Files:**
- Modify: `src/components/OrderModal.tsx`
- Modify: `src/components/CartCheckoutModal.tsx`

- [ ] **Step 1: Убрать appendOrder из OrderModal.tsx**

В `src/components/OrderModal.tsx`:
- Удалить импорт: `import { appendOrder } from '@/lib/orderHistory';` (строка ~8).
- Удалить две строки с вызовом `appendOrder({ items: [[perfumeId, volume, 1, price]], total: price, type: 'order' });` (строки ~176 и ~183).

- [ ] **Step 2: Убрать appendOrder из CartCheckoutModal.tsx**

В `src/components/CartCheckoutModal.tsx`:
- Удалить импорт: `import { appendOrder } from '@/lib/orderHistory';` (строка ~10).
- Удалить два блока вызова `appendOrder({ ... })` (строки ~181 и ~195). Прочитать
  файл, чтобы захватить полные многострочные вызовы целиком.

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: компиляция проходит, нет ссылок на `appendOrder`.

- [ ] **Step 4: Commit**

```bash
git add src/components/OrderModal.tsx src/components/CartCheckoutModal.tsx
git commit -m "feat(order-crm): убрать запись истории в CloudStorage (источник — Supabase)"
```

---

## Task 9: Документация и деплой-инструкция

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Обновить раздел Order CRM в CLAUDE.md**

В CLAUDE.md, в разделе про Order CRM, обновить описание хранилища: Airtable
`Orders` → Supabase `orders` + `order_items`. Добавить:

```markdown
**Хранилище заказов (этап 3): Supabase.** Worker `order-webhook.js` пишет заказ в
`orders` (+ позиции в `order_items`, нормализовано, FK на `perfumes`), статусы
патчит в `orders`. Фолбэк сохранён: при недоступности Supabase заказ всё равно
уходит в чат без номера (лид не теряется). Маршрут `POST /history` отдаёт историю
Mini App по `tg_user_id` после проверки Telegram initData (HMAC по bot-токену,
свежесть 24ч). Клиент (`lib/orderHistory.ts`) читает из `/history`; запись в
CloudStorage убрана. Чистые функции (`verifyInitData`, `buildOrderRows`,
`parseStatusCallback`) — `node --test workers/order-webhook.test.mjs`.

**Env Worker'а (добавить):** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Airtable-env
(`AIRTABLE_*`) можно удалить после стабилизации. Старые заказы Airtable не
мигрируются (Supabase с чистого листа).
```

- [ ] **Step 2: Commit (если CLAUDE.md не в gitignore)**

```bash
git add CLAUDE.md && git commit -m "docs(order-crm): Supabase в разделе Order CRM" || echo "CLAUDE.md в gitignore — пропускаем"
```

---

## Деплой и ручная проверка (владелец, после реализации)

1. **Supabase:** выполнить `supabase/003_orders.sql` в SQL Editor.
2. **Cloudflare (Worker заказов `order-webhook`):** добавить env `SUPABASE_URL`,
   `SUPABASE_SERVICE_KEY`. Передеплоить.
3. **Vercel:** `NEXT_PUBLIC_ORDER_WEBHOOK_URL` уже задан (тот же Worker). Задеплоить
   фронт (клиентский orderHistory).
4. **Чеклист:**
   - [ ] Одиночный заказ на сайте → в чат с номером + кнопки → строки в `orders`/`order_items`.
   - [ ] Заказ-корзина (2+ позиции) → несколько `order_items`.
   - [ ] Кнопки статуса → меняется `orders.status`, сообщение редактируется.
   - [ ] Консультация → `type=consultation`.
   - [ ] История в Mini App → свои заказы со статусами.
   - [ ] Поддельный initData в `/history` → 401.
   - [ ] Недоступность Supabase → заказ уходит в чат (фолбэк), сайт показывает успех.

---

## Self-Review (выполнено при написании плана)

**Покрытие спеки:**
- Схема `orders`+`order_items`, RLS, FK on delete set null → Task 1. ✓
- `createSupabaseOrder` (orders→order_items, частичный сбой) → Task 5. ✓
- `patchSupabaseStatus` → Task 5. ✓
- `callback_data s:<id>:<status>` (id = bigint) → Task 2, Task 5. ✓
- Маршрут `/history` + проверка initData (HMAC, свежесть 24ч) → Task 4, Task 6. ✓
- Клиент читает из `/history`, `appendOrder` удалён → Task 7, Task 8. ✓
- Снимок позиции (название/цена) → Task 1 (схема), Task 3 (buildOrderRows). ✓
- Env-изменения → Task 9 (доки), деплой-секция. ✓
- Фолбэк сохранён (лид не теряется) → Task 5 (создание возвращает null, чат как был). ✓
- Тестирование (node --test + ручной чеклист) → Tasks 2-4, деплой-секция. ✓

**Тип-консистентность:** `buildOrderRows` → `{ order, items }` используется в Task 3
(тест) и Task 5 (`createSupabaseOrder`). `verifyInitData` → `{ ok, userId }` в Task 4
(тест) и Task 6 (`handleHistory`). `parseStatusCallback` → `{ id, status }` в Task 2
и Task 5 (передаётся в `statusKeyboard(order.id)`/`patchSupabaseStatus`). Имена
колонок (`tg_user_id`, `order_number`, `perfume_id`) совпадают между Task 1 (схема),
Task 3/5 (запись), Task 6 (чтение).

**Известное упрощение (не плейсхолдер):** Task 7 Step 2 описывает адаптацию
`OrderHistory.tsx` под существующую вёрстку без полного кода — потому что текущая
разметка файла неизвестна на момент написания плана и должна быть прочитана при
исполнении. Поля нового типа `Order` заданы явно (Task 7 Step 1), вёрстка —
сохранить существующие классы. Это единственное место с «адаптировать по месту»;
интерфейс данных полностью определён.
```
