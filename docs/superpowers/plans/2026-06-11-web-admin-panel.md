# Веб-админка HARUNGI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Раздел `/admin` на том же Next.js-сайте: вход по одному паролю, управление каталогом (полный CRUD + фото) и заказами (список, фильтр/поиск, смена статуса, примечания).

**Architecture:** Подход A. Серверные Route Handlers (`/api/admin/*`) пишут в Supabase под `service_role` (server-only); `middleware.ts` защищает `/admin/*` и `/api/admin/*` подписанной httpOnly-cookie. Service_role-ключ в браузер не попадает. Логика нормализации/валидации каталога переносится из `workers/admin-bot.js` в `src/lib/admin/catalog-logic.ts` как самостоятельный источник правды — Telegram админ-бот каталога после запуска веб-админки **удаляется** (Worker отключается). Worker приёма заказов (`order-webhook.js`) не трогается.

**Tech Stack:** Next.js 14.2.35 (App Router, middleware, Route Handlers), TypeScript, Tailwind, Supabase REST + Storage (service_role), Web Crypto (HMAC), `node --test` для юнитов.

Спек: `docs/superpowers/specs/2026-06-11-web-admin-panel-design.md`.

---

## Фазы

- **Фаза 1 — Фундамент:** чистая логика каталога (копия из бота) + тесты; cookie-сессия + тесты; серверный Supabase-клиент.
- **Фаза 2 — Авторизация:** login/logout API, middleware, страница логина, layout админки.
- **Фаза 3 — Заказы:** API списка/патча, страница со списком, фильтром, сменой статуса, note.
- **Фаза 4 — Каталог:** API CRUD + фото, список, форма создания/правки, ревалидация.
- **Фаза 5 — Дашборд и полировка:** счётчики, навигация, финальная сборка.
- **Фаза 6 — Вывод бота:** удаление кода админ-бота из репозитория (после того,
  как веб-админка проверена); отключение Worker'а — ручной шаг.

Каждая фаза заканчивается зелёным `npm run build`.

---

## Фаза 1 — Фундамент

### Task 1: Чистая логика каталога (перенос из бота) + тесты

Переносим проверенные функции из `workers/admin-bot.js` в `src/lib/admin/catalog-logic.ts` — это **самостоятельный источник правды** для веб-форм (нормализация/валидация/slug). Бот каталога удаляется в Фазе 6, поэтому дублирования не остаётся.

**Files:**
- Create: `src/lib/admin/catalog-logic.ts`
- Test: `src/lib/admin/catalog-logic.test.mjs`

- [ ] **Step 1: Написать падающий тест**

Create `src/lib/admin/catalog-logic.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  parseCsv, ENUMS, MULTI_ENUMS,
} from './catalog-logic.ts';

test('slugify: кириллица → латиница kebab', () => {
  assert.equal(slugify('Tom Ford', 'Black Orchid'), 'tom-ford-black-orchid');
  assert.equal(slugify('Кристиан Диор', 'Саваж'), 'kristian-dior-savazh');
});

test('makeUniqueId: коллизия → суффикс', () => {
  const ex = new Set(['a-b']);
  assert.equal(makeUniqueId('a-b', ex), 'a-b-2');
  assert.equal(makeUniqueId('c-d', ex), 'c-d');
});

test('validateField: обязательные/числа/enum', () => {
  assert.equal(validateField('name', '  ').ok, false);
  assert.equal(validateField('name', 'X').ok, true);
  assert.equal(validateField('price_5ml', 'abc').ok, false);
  assert.equal(validateField('price_5ml', '650').value, 650);
  assert.equal(validateField('gender', 'мужской').ok, true);
  assert.equal(validateField('gender', 'другое').ok, false);
});

test('parseCsv: строка → массив', () => {
  assert.deepEqual(parseCsv('осень, зима'), ['осень', 'зима']);
  assert.deepEqual(parseCsv(''), []);
});

test('draftToPerfumeRow: массивы → CSV, числа/флаги', () => {
  const row = draftToPerfumeRow({
    id: 'x', name: 'X', brand: 'B',
    notes_top: ['а', 'б'], season: ['зима'], occasion: ['вечер'],
    price_5ml: 650, inStock: true,
  });
  assert.equal(row.notes_top, 'а, б');
  assert.equal(row.season, 'зима');
  assert.equal(row.occasion, 'вечер');
  assert.equal(row.price_5ml, 650);
  assert.equal(row.inStock, true);
  assert.equal(row.price_10ml, null);
});

test('ENUMS/MULTI_ENUMS: значения совпадают с типами сайта', () => {
  assert.deepEqual(ENUMS.format, ['оригинал', 'распив']);
  assert.deepEqual(MULTI_ENUMS.season, ['весна', 'лето', 'осень', 'зима', 'всесезонный']);
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `node --test src/lib/admin/catalog-logic.test.mjs`
Expected: FAIL — `Cannot find module './catalog-logic.ts'`.

(Если `node --test` не резолвит `.ts` напрямую — использовать `npx tsx --test src/lib/admin/catalog-logic.test.mjs`. Проверить наличие `tsx`: `npx tsx --version`.)

- [ ] **Step 3: Создать `src/lib/admin/catalog-logic.ts`**

Перенести вербатим из `workers/admin-bot.js` (строки ~5–199), адаптировав под TS-экспорт. Полное содержимое:

```ts
// src/lib/admin/catalog-logic.ts
// Чистые функции каталога (slug/валидация/нормализация) — источник правды для
// веб-админки. Изначально жили в workers/admin-bot.js; бот выводится из
// эксплуатации (см. Фазу 6 плана), дублирования не остаётся.

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function translit(str: string): string {
  return str.split('').map((ch) => {
    const lower = ch.toLowerCase();
    const mapped = TRANSLIT[lower];
    return mapped !== undefined ? mapped : ch;
  }).join('');
}

export function slugify(brand: string, name: string): string {
  const raw = `${brand} ${name}`;
  return translit(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function makeUniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export const ENUMS: Record<string, string[]> = {
  gender: ['мужской', 'женский', 'унисекс'],
  scentType: ['цветочный', 'восточный', 'древесный', 'свежий', 'фужерный', 'шипровый', 'гурманский'],
  format: ['оригинал', 'распив'],
};

export const MULTI_ENUMS: Record<string, string[]> = {
  season: ['весна', 'лето', 'осень', 'зима', 'всесезонный'],
  occasion: ['офис', 'вечер', 'ежедневно', 'свидание', 'путешествие'],
};

export function parseCsv(val: unknown): string[] {
  return typeof val === 'string' && val
    ? val.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
}

const PRICE_STEPS = ['price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original', 'original_volume_ml'];
const REQUIRED_TEXT = ['name', 'brand'];

export type ValidateResult = { ok: true; value: unknown } | { ok: false; error: string };

export function validateField(step: string, raw: unknown): ValidateResult {
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
    if (!ENUMS[step].includes(value as string)) return { ok: false, error: 'Выберите вариант' };
    return { ok: true, value };
  }
  return { ok: true, value };
}

function csvOrNull(arr: unknown): string | null {
  return Array.isArray(arr) && arr.length ? arr.join(', ') : null;
}
function numOrNull(v: unknown): number | null {
  return v == null || v === '' ? null : Number(v);
}

export interface PerfumeDraft {
  id: string;
  name: string;
  brand: string;
  description?: string;
  notes_top?: string[];
  notes_middle?: string[];
  notes_base?: string[];
  gender?: string;
  scentType?: string;
  format?: string;
  season?: string[];
  occasion?: string[];
  images?: string[];
  price_5ml?: number | string;
  price_10ml?: number | string;
  price_15ml?: number | string;
  price_20ml?: number | string;
  price_original?: number | string;
  original_volume_ml?: number | string;
  inStock?: boolean;
  featured?: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
}

export function draftToPerfumeRow(draft: PerfumeDraft): Record<string, unknown> {
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
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `npx tsx --test src/lib/admin/catalog-logic.test.mjs`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/catalog-logic.ts src/lib/admin/catalog-logic.test.mjs
git commit -m "feat(admin): чистая логика каталога (копия из бота) + тесты"
```

---

### Task 2: Cookie-сессия (sign/verify) + тесты

HMAC-подпись сессии на Web Crypto (работает и в Node, и в Edge middleware).

**Files:**
- Create: `src/lib/admin/session.ts`
- Test: `src/lib/admin/session.test.mjs`

- [ ] **Step 1: Написать падающий тест**

Create `src/lib/admin/session.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession } from './session.ts';

const SECRET = 'test-secret-123';

test('verify принимает свежую подпись', async () => {
  const token = await signSession(SECRET, 7 * 24 * 3600);
  assert.equal(await verifySession(SECRET, token), true);
});

test('verify отвергает подделанную подпись', async () => {
  const token = await signSession(SECRET, 3600);
  const tampered = token.slice(0, -2) + 'xx';
  assert.equal(await verifySession(SECRET, tampered), false);
});

test('verify отвергает другой секрет', async () => {
  const token = await signSession(SECRET, 3600);
  assert.equal(await verifySession('other', token), false);
});

test('verify отвергает протухший токен', async () => {
  const token = await signSession(SECRET, -1); // уже истёк
  assert.equal(await verifySession(SECRET, token), false);
});

test('verify отвергает мусор', async () => {
  assert.equal(await verifySession(SECRET, ''), false);
  assert.equal(await verifySession(SECRET, 'abc'), false);
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `npx tsx --test src/lib/admin/session.test.mjs`
Expected: FAIL — `Cannot find module './session.ts'`.

- [ ] **Step 3: Создать `src/lib/admin/session.ts`**

```ts
// src/lib/admin/session.ts
// Подпись/проверка сессионной cookie через HMAC-SHA256 (Web Crypto — работает
// и в Node Route Handlers, и в Edge middleware). Формат токена: "<exp>.<hexsig>",
// где exp — unix-секунды протухания, sig = HMAC(secret, exp).

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Токен с протуханием через ttlSeconds от текущего момента. */
export async function signSession(secret: string, ttlSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmacHex(secret, String(exp));
  return `${exp}.${sig}`;
}

/** true, если подпись валидна и срок не истёк. Любой сбой → false. */
export async function verifySession(secret: string, token: string): Promise<boolean> {
  try {
    if (!token || !token.includes('.')) return false;
    const [expStr, sig] = token.split('.');
    const exp = Number(expStr);
    if (!Number.isFinite(exp)) return false;
    if (Math.floor(Date.now() / 1000) > exp) return false;
    const expected = await hmacHex(secret, expStr);
    // Сравнение фиксированной длины (constant-ish).
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 3600; // 7 дней
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `npx tsx --test src/lib/admin/session.test.mjs`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/session.ts src/lib/admin/session.test.mjs
git commit -m "feat(admin): HMAC cookie-сессия (sign/verify) + тесты"
```

---

### Task 3: Серверный Supabase-клиент (service_role)

Единственное место с `SUPABASE_SERVICE_KEY`. `import 'server-only'` запрещает импорт в client-компоненты.

**Files:**
- Create: `src/lib/admin/supabase-server.ts`

- [ ] **Step 1: Создать `src/lib/admin/supabase-server.ts`**

```ts
// src/lib/admin/supabase-server.ts
import 'server-only';

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function assertEnv(): { url: string; key: string } {
  if (!URL || !SERVICE_KEY) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY не заданы');
  return { url: URL, key: SERVICE_KEY };
}

function headers() {
  const { key } = assertEnv();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

// --- Каталог ---

export async function selectPerfumes(): Promise<Record<string, unknown>[]> {
  const { url } = assertEnv();
  const res = await fetch(`${url}/rest/v1/perfumes?select=*&order=brand.asc`, {
    headers: headers(), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase select perfumes ${res.status}`);
  return res.json();
}

export async function getPerfumeById(id: string): Promise<Record<string, unknown> | null> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: headers(), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Supabase get perfume ${res.status}`);
  const rows = await res.json();
  return rows[0] ?? null;
}

export async function upsertPerfume(row: Record<string, unknown>): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(`${url}/rest/v1/perfumes`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase upsert ${res.status}: ${await res.text()}`);
}

export async function patchPerfume(id: string, patch: Record<string, unknown>): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }
  );
  if (!res.ok) throw new Error(`Supabase patch perfume ${res.status}`);
}

export async function deletePerfume(id: string): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: headers() }
  );
  if (!res.ok) throw new Error(`Supabase delete perfume ${res.status}`);
}

// --- Заказы ---

export interface OrderQuery { status?: string; search?: string }

export async function selectOrders(q: OrderQuery = {}): Promise<Record<string, unknown>[]> {
  const { url } = assertEnv();
  const params = new URLSearchParams();
  params.set('select', '*,order_items(*)');
  params.set('order', 'created_at.desc');
  if (q.status) params.set('status', `eq.${q.status}`);
  if (q.search) {
    const s = q.search.trim();
    if (/^\d+$/.test(s)) params.set('order_number', `eq.${s}`);
    else params.set('or', `(customer_name.ilike.*${s}*,contact.ilike.*${s}*)`);
  }
  const res = await fetch(`${url}/rest/v1/orders?${params.toString()}`, {
    headers: headers(), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase select orders ${res.status}`);
  return res.json();
}

export async function patchOrder(id: number, patch: Record<string, unknown>): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/orders?id=eq.${id}`,
    { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }
  );
  if (!res.ok) throw new Error(`Supabase patch order ${res.status}`);
}

export async function countOrdersByStatus(): Promise<Record<string, number>> {
  const rows = await selectOrders();
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const s = String(r.status);
    counts[s] = (counts[s] || 0) + 1;
  }
  counts.total = rows.length;
  return counts;
}

// --- Storage (фото) ---

export async function uploadImage(bytes: ArrayBuffer, contentType: string, path: string): Promise<string> {
  const { url } = assertEnv();
  const res = await fetch(`${url}/storage/v1/object/perfume-images/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY as string,
      Authorization: `Bearer ${SERVICE_KEY as string}`,
      'Content-Type': contentType || 'image/jpeg',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage upload ${res.status}: ${await res.text()}`);
  return `${url}/storage/v1/object/public/perfume-images/${path}`;
}

export async function deleteImages(prefixes: string[]): Promise<void> {
  if (!prefixes.length) return;
  const { url } = assertEnv();
  await fetch(`${url}/storage/v1/object/perfume-images`, {
    method: 'DELETE', headers: headers(), body: JSON.stringify({ prefixes }),
  }).catch(() => {});
}
```

- [ ] **Step 2: Проверить сборку TypeScript**

Run: `npm run build`
Expected: `✓ Compiled successfully` (модуль не импортируется ниоткуда пока — проверяем только типы; fetch-ошибка Supabase на этапе сборки публичных страниц допустима, как в текущем проекте).

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/supabase-server.ts
git commit -m "feat(admin): серверный Supabase-клиент (service_role, server-only)"
```

---

## Фаза 2 — Авторизация

### Task 4: Login/Logout API

**Files:**
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`

- [ ] **Step 1: Создать `src/app/api/admin/login/route.ts`**

```ts
// src/app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/admin/session';

const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_SESSION_SECRET;

/** Константное по времени сравнение строк. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  if (!PASSWORD || !SECRET) {
    return NextResponse.json({ ok: false, error: 'Сервер не настроен' }, { status: 500 });
  }
  let body: { password?: string };
  try { body = await req.json(); } catch { body = {}; }
  const password = String(body.password ?? '');
  if (!timingSafeEqual(password, PASSWORD)) {
    return NextResponse.json({ ok: false, error: 'Неверный пароль' }, { status: 401 });
  }
  const token = await signSession(SECRET, SESSION_TTL_SECONDS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
```

- [ ] **Step 2: Создать `src/app/api/admin/logout/route.ts`**

```ts
// src/app/api/admin/logout/route.ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/admin/session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; в списке роутов появятся `/api/admin/login`, `/api/admin/logout`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/login/route.ts src/app/api/admin/logout/route.ts
git commit -m "feat(admin): login/logout API (пароль → подписанная cookie)"
```

---

### Task 5: Middleware (защита /admin и /api/admin)

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Создать `src/middleware.ts`**

```ts
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin/session';

const SECRET = process.env.ADMIN_SESSION_SECRET;

// Пути, доступные без сессии (иначе не войти).
const PUBLIC_PATHS = ['/admin/login', '/api/admin/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value ?? '';
  const ok = SECRET ? await verifySession(SECRET, token) : false;
  if (ok) return NextResponse.next();

  // API → 401 JSON; страницы → редирект на логин.
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; в выводе — `ƒ Middleware`.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(admin): middleware защиты /admin и /api/admin по cookie"
```

---

### Task 6: Layout админки + страница логина

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/components/admin/AdminNav.tsx`

- [ ] **Step 1: Создать `src/components/admin/AdminNav.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Дашборд' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/catalog', label: 'Каталог' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/admin/login') return null;

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <nav className="flex items-center gap-4 border-b border-cream-200 px-4 sm:px-6 h-14 bg-cream-50">
      <span className="font-display tracking-[0.2em] text-ink-900">HARUNGI</span>
      <div className="flex gap-3 ml-4">
        {LINKS.map((l) => {
          const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`text-sm transition-colors ${active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'}`}>
              {l.label}
            </Link>
          );
        })}
      </div>
      <button onClick={logout} className="ml-auto text-sm text-ink-500 hover:text-ink-900">Выход</button>
    </nav>
  );
}
```

- [ ] **Step 2: Создать `src/app/admin/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';

export const metadata: Metadata = { title: 'Админка HARUNGI', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream-100">
      <AdminNav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Создать `src/app/admin/login/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) { router.push('/admin'); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Ошибка входа'); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-cream-50 rounded-2xl p-6"
        style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
        <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Вход в админку</h1>
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль" className="input-base mb-4" />
        {error && <p role="alert" className="text-sm text-ink-500 mb-4">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
```

Примечание: `/admin/login` использует общий `admin/layout.tsx`, но `AdminNav` сам прячется на этом пути (см. Step 1), поэтому навигация на логине не показывается.

- [ ] **Step 4: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; роуты `/admin/login` и `/admin` (заглушка появится в Task 11; пока `/admin` может не существовать — это нормально, добавим дашборд позже).

Если сборка требует существования `/admin/page.tsx` для линка — временно создать заглушку `src/app/admin/page.tsx` с `export default function(){return null}` (будет заменена в Task 11).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/login/page.tsx src/components/admin/AdminNav.tsx
git commit -m "feat(admin): layout, навигация, страница логина"
```

---

## Фаза 3 — Заказы

### Task 7: API заказов (список + патч)

**Files:**
- Create: `src/app/api/admin/orders/route.ts`
- Create: `src/app/api/admin/orders/[id]/route.ts`

- [ ] **Step 1: Создать `src/app/api/admin/orders/route.ts`**

```ts
// src/app/api/admin/orders/route.ts
import { NextResponse } from 'next/server';
import { selectOrders } from '@/lib/admin/supabase-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const orders = await selectOrders({ status, search });
    return NextResponse.json({ ok: true, orders });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Создать `src/app/api/admin/orders/[id]/route.ts`**

```ts
// src/app/api/admin/orders/[id]/route.ts
import { NextResponse } from 'next/server';
import { patchOrder } from '@/lib/admin/supabase-server';

const STATUSES = ['new', 'accepted', 'shipped', 'done', 'canceled'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return NextResponse.json({ ok: false, error: 'bad status' }, { status: 400 });
      patch.status = body.status;
    }
    if (body.note !== undefined) patch.note = String(body.note);
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });
    await patchOrder(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; роуты `/api/admin/orders` и `/api/admin/orders/[id]`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/orders
git commit -m "feat(admin): API заказов (список с фильтром/поиском + патч статуса/note)"
```

---

### Task 8: Страница заказов (список, фильтр, статус, note)

**Files:**
- Create: `src/app/admin/orders/page.tsx`
- Create: `src/components/admin/OrdersClient.tsx`

- [ ] **Step 1: Создать `src/app/admin/orders/page.tsx`**

```tsx
import OrdersClient from '@/components/admin/OrdersClient';
export const dynamic = 'force-dynamic';
export default function OrdersPage() {
  return <OrdersClient />;
}
```

- [ ] **Step 2: Создать `src/components/admin/OrdersClient.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';

interface OrderItem { perfume_name: string; brand: string; volume: string; quantity: number; price: number }
interface Order {
  id: number; order_number: number; status: string; customer_name: string;
  contact: string; total: number; type: string; note: string | null;
  created_at: string; order_items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', accepted: 'Принят', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён',
};
const STATUS_TABS = ['', 'new', 'accepted', 'shipped', 'done', 'canceled'];
const TAB_LABEL: Record<string, string> = { '': 'Все', ...STATUS_LABELS };

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json().catch(() => ({ orders: [] }));
    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: number, next: string) => {
    setOrders((prev) => prev?.map((o) => (o.id === id ? { ...o, status: next } : o)) ?? prev);
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
  };

  const saveNote = async (id: number, note: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-4">Заказы</h1>

      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${status === s ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
            {TAB_LABEL[s]}
          </button>
        ))}
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск: имя, контакт или № заказа" className="input-base mb-5" />

      {orders === null ? (
        <p className="text-ink-300 text-sm">Загрузка…</p>
      ) : orders.length === 0 ? (
        <p className="text-ink-300 text-sm">Заказов нет.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => {
            const open = openId === o.id;
            return (
              <div key={o.id} className="rounded-xl bg-cream-50" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
                <button onClick={() => setOpenId(open ? null : o.id)}
                  className="w-full flex justify-between items-center px-4 py-3 text-left">
                  <div>
                    <p className="text-sm text-ink-900">№{o.order_number} · {o.customer_name}</p>
                    <p className="text-xs text-ink-300">
                      {new Date(o.created_at).toLocaleDateString('ru-RU')} · {o.contact} · {STATUS_LABELS[o.status] ?? o.status}
                    </p>
                  </div>
                  <p className="font-display text-lg font-light text-ink-900 tabular-nums">{o.total.toLocaleString('ru-RU')} ₽</p>
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-cream-200 pt-3 flex flex-col gap-3">
                    {o.order_items.map((it, i) => (
                      <div key={i} className="flex justify-between text-xs text-ink-500">
                        <span>{it.brand ? `${it.brand} — ` : ''}{it.perfume_name} · {it.volume}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
                        <span className="tabular-nums">{(it.quantity * it.price).toLocaleString('ru-RU')} ₽</span>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_TABS.filter(Boolean).map((s) => (
                        <button key={s} onClick={() => changeStatus(o.id, s)}
                          className={`text-xs px-2.5 py-1 rounded-full border ${o.status === s ? 'bg-gold-500 text-white border-gold-500' : 'border-cream-200 text-ink-500'}`}>
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <textarea defaultValue={o.note ?? ''} placeholder="Примечание менеджера"
                      onBlur={(e) => saveNote(o.id, e.target.value)}
                      className="input-base text-sm" rows={2} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; роут `/admin/orders`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/orders/page.tsx src/components/admin/OrdersClient.tsx
git commit -m "feat(admin): страница заказов (список, фильтр/поиск, статус, note)"
```

---

## Фаза 4 — Каталог

### Task 9: API каталога (CRUD)

**Files:**
- Create: `src/app/api/admin/catalog/route.ts`
- Create: `src/app/api/admin/catalog/[id]/route.ts`

- [ ] **Step 1: Создать `src/app/api/admin/catalog/route.ts`**

```ts
// src/app/api/admin/catalog/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { selectPerfumes, upsertPerfume } from '@/lib/admin/supabase-server';
import { slugify, makeUniqueId, draftToPerfumeRow, validateField, type PerfumeDraft } from '@/lib/admin/catalog-logic';

export async function GET() {
  try {
    const perfumes = await selectPerfumes();
    return NextResponse.json({ ok: true, perfumes });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as PerfumeDraft;
    for (const f of ['name', 'brand']) {
      const v = validateField(f, (draft as Record<string, unknown>)[f]);
      if (!v.ok) return NextResponse.json({ ok: false, error: `${f}: ${v.error}` }, { status: 400 });
    }
    const all = await selectPerfumes();
    const existing = new Set(all.map((p) => String(p.id)));
    const id = makeUniqueId(slugify(draft.brand, draft.name), existing);
    const row = draftToPerfumeRow({ ...draft, id });
    await upsertPerfume(row);
    revalidatePath('/catalog');
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Создать `src/app/api/admin/catalog/[id]/route.ts`**

```ts
// src/app/api/admin/catalog/[id]/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPerfumeById, patchPerfume, deletePerfume, deleteImages } from '@/lib/admin/supabase-server';
import { draftToPerfumeRow, type PerfumeDraft } from '@/lib/admin/catalog-logic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const row = await getPerfumeById(params.id);
    if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, perfume: row });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const draft = (await req.json()) as PerfumeDraft;
    // id стабилен: не пересоздаём. Берём готовую строку и убираем id из патча.
    const row = draftToPerfumeRow({ ...draft, id: params.id });
    delete (row as Record<string, unknown>).id;
    await patchPerfume(params.id, row);
    revalidatePath('/catalog');
    revalidatePath(`/product/${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deletePerfume(params.id);
    await deleteImages([params.id]); // best-effort: файлы с префиксом id
    revalidatePath('/catalog');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; роуты `/api/admin/catalog` и `/api/admin/catalog/[id]`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/catalog/route.ts src/app/api/admin/catalog/[id]/route.ts
git commit -m "feat(admin): API каталога (GET/POST/PATCH/DELETE + revalidate)"
```

---

### Task 10: API загрузки фото

**Files:**
- Create: `src/app/api/admin/catalog/[id]/photo/route.ts`

- [ ] **Step 1: Создать `src/app/api/admin/catalog/[id]/photo/route.ts`**

```ts
// src/app/api/admin/catalog/[id]/photo/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPerfumeById, patchPerfume, uploadImage, deleteImages } from '@/lib/admin/supabase-server';

// POST: multipart/form-data с полем "file" → грузит в Storage, дописывает в images CSV.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const row = await getPerfumeById(params.id);
    if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'no file' }, { status: 400 });

    const existing = typeof row.images === 'string' && row.images
      ? row.images.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const bytes = await file.arrayBuffer();
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${params.id}-${existing.length + 1}.${ext}`;
    const url = await uploadImage(bytes, file.type, path);
    const images = [...existing, url];
    await patchPerfume(params.id, { images: images.join(', ') });
    revalidatePath('/catalog');
    revalidatePath(`/product/${params.id}`);
    return NextResponse.json({ ok: true, images });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

// DELETE: очистить все фото товара.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await patchPerfume(params.id, { images: null });
    await deleteImages([params.id]);
    revalidatePath('/catalog');
    revalidatePath(`/product/${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; роут `/api/admin/catalog/[id]/photo`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/catalog/[id]/photo/route.ts"
git commit -m "feat(admin): API загрузки/очистки фото товара"
```

---

### Task 11: Список каталога + форма товара

**Files:**
- Create: `src/app/admin/catalog/page.tsx`
- Create: `src/components/admin/CatalogListClient.tsx`
- Create: `src/app/admin/catalog/new/page.tsx`
- Create: `src/app/admin/catalog/[id]/page.tsx`
- Create: `src/components/admin/PerfumeForm.tsx`

- [ ] **Step 1: Создать `src/components/admin/PerfumeForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ENUMS, MULTI_ENUMS } from '@/lib/admin/catalog-logic';

type Row = Record<string, unknown>;

const TEXT_FIELDS: [string, string][] = [
  ['name', 'Название *'], ['brand', 'Бренд *'], ['description', 'Описание'],
  ['notes_top', 'Верхние ноты'], ['notes_middle', 'Средние ноты'], ['notes_base', 'Базовые ноты'],
];
const NUM_FIELDS: [string, string][] = [
  ['price_5ml', 'Цена 5мл'], ['price_10ml', 'Цена 10мл'], ['price_15ml', 'Цена 15мл'],
  ['price_20ml', 'Цена 20мл'], ['price_original', 'Цена оригинала'], ['original_volume_ml', 'Объём оригинала, мл'],
];
const FLAGS: [string, string][] = [
  ['inStock', 'В наличии'], ['featured', 'Featured'], ['newArrival', 'Новинка'], ['bestseller', 'Хит'],
];
const CSV_FIELDS = new Set(['notes_top', 'notes_middle', 'notes_base']);

export default function PerfumeForm({ initial, id }: { initial?: Row; id?: string }) {
  const router = useRouter();
  const init = initial ?? {};
  const [text, setText] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const [k] of [...TEXT_FIELDS, ...NUM_FIELDS]) o[k] = init[k] != null ? String(init[k]) : '';
    return o;
  });
  const [enums, setEnums] = useState<Record<string, string>>(() => ({
    gender: String(init.gender ?? ''), scentType: String(init.scentType ?? ''), format: String(init.format ?? ''),
  }));
  const [multi, setMulti] = useState<Record<string, string[]>>(() => ({
    season: typeof init.season === 'string' && init.season ? init.season.split(',').map((s: string) => s.trim()) : [],
    occasion: typeof init.occasion === 'string' && init.occasion ? init.occasion.split(',').map((s: string) => s.trim()) : [],
  }));
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    for (const [k] of FLAGS) o[k] = Boolean(init[k]);
    return o;
  });
  const [images, setImages] = useState<string[]>(
    typeof init.images === 'string' && init.images ? init.images.split(',').map((s: string) => s.trim()) : []
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleMulti = (field: string, val: string) =>
    setMulti((p) => ({ ...p, [field]: p[field].includes(val) ? p[field].filter((x) => x !== val) : [...p[field], val] }));

  const buildDraft = () => {
    const draft: Record<string, unknown> = { ...enums, ...flags };
    for (const [k] of TEXT_FIELDS) {
      draft[k] = CSV_FIELDS.has(k)
        ? (text[k] ? text[k].split(',').map((s) => s.trim()).filter(Boolean) : [])
        : text[k];
    }
    for (const [k] of NUM_FIELDS) draft[k] = text[k] === '' ? undefined : Number(text[k]);
    draft.season = multi.season; draft.occasion = multi.occasion;
    draft.images = images;
    return draft;
  };

  const save = async () => {
    setSaving(true); setError('');
    const draft = buildDraft();
    const url = id ? `/api/admin/catalog/${id}` : '/api/admin/catalog';
    const method = id ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    setSaving(false);
    if (res.ok) { router.push('/admin/catalog'); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Ошибка сохранения'); }
  };

  const uploadPhoto = async (file: File) => {
    if (!id) { setError('Сначала сохраните товар, затем добавляйте фото.'); return; }
    const fd = new FormData(); fd.set('file', file);
    const res = await fetch(`/api/admin/catalog/${id}/photo`, { method: 'POST', body: fd });
    const d = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(d.images)) setImages(d.images);
    else setError(d.error || 'Ошибка загрузки фото');
  };

  const clearPhotos = async () => {
    if (!id) return;
    await fetch(`/api/admin/catalog/${id}/photo`, { method: 'DELETE' });
    setImages([]);
  };

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      {TEXT_FIELDS.map(([k, label]) => (
        <label key={k} className="block">
          <span className="label text-ink-500 block mb-1">{label}</span>
          <input value={text[k]} onChange={(e) => setText((p) => ({ ...p, [k]: e.target.value }))} className="input-base" />
        </label>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {NUM_FIELDS.map(([k, label]) => (
          <label key={k} className="block">
            <span className="label text-ink-500 block mb-1">{label}</span>
            <input inputMode="numeric" value={text[k]} onChange={(e) => setText((p) => ({ ...p, [k]: e.target.value }))} className="input-base" />
          </label>
        ))}
      </div>
      {Object.keys(ENUMS).map((field) => (
        <div key={field}>
          <span className="label text-ink-500 block mb-1">{field}</span>
          <div className="flex flex-wrap gap-1.5">
            {ENUMS[field].map((v) => (
              <button key={v} type="button" onClick={() => setEnums((p) => ({ ...p, [field]: v }))}
                className={`text-xs px-3 py-1.5 rounded-full border ${enums[field] === v ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(MULTI_ENUMS).map((field) => (
        <div key={field}>
          <span className="label text-ink-500 block mb-1">{field} (пусто = авто)</span>
          <div className="flex flex-wrap gap-1.5">
            {MULTI_ENUMS[field].map((v) => (
              <button key={v} type="button" onClick={() => toggleMulti(field, v)}
                className={`text-xs px-3 py-1.5 rounded-full border ${multi[field].includes(v) ? 'bg-gold-500 text-white border-gold-500' : 'border-cream-200 text-ink-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        {FLAGS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={flags[k]} onChange={(e) => setFlags((p) => ({ ...p, [k]: e.target.checked }))} />
            {label}
          </label>
        ))}
      </div>

      <div>
        <span className="label text-ink-500 block mb-1">Фото ({images.length})</span>
        {!id && <p className="text-xs text-ink-300 mb-2">Доступно после сохранения товара.</p>}
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" className="w-16 h-16 object-cover rounded-lg" />
          ))}
        </div>
        {id && (
          <div className="flex gap-3 items-center">
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            {images.length > 0 && <button type="button" onClick={clearPhotos} className="text-xs text-ink-500 underline">Очистить</button>}
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-ink-500">{error}</p>}
      <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
        {saving ? 'Сохранение…' : id ? 'Сохранить' : 'Создать'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Создать `src/app/admin/catalog/new/page.tsx`**

```tsx
import PerfumeForm from '@/components/admin/PerfumeForm';
export default function NewPerfumePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-4">Новый аромат</h1>
      <PerfumeForm />
    </div>
  );
}
```

- [ ] **Step 3: Создать `src/app/admin/catalog/[id]/page.tsx`**

```tsx
import { getPerfumeById } from '@/lib/admin/supabase-server';
import PerfumeForm from '@/components/admin/PerfumeForm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditPerfumePage({ params }: { params: { id: string } }) {
  const perfume = await getPerfumeById(params.id);
  if (!perfume) notFound();
  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-4">Правка: {String(perfume.brand)} — {String(perfume.name)}</h1>
      <PerfumeForm initial={perfume} id={params.id} />
    </div>
  );
}
```

- [ ] **Step 4: Создать `src/components/admin/CatalogListClient.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface P { id: string; brand: string; name: string; images: string | null; inStock: boolean }

export default function CatalogListClient() {
  const router = useRouter();
  const [items, setItems] = useState<P[] | null>(null);
  const [q, setQ] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/catalog');
    const d = await res.json().catch(() => ({ perfumes: [] }));
    setItems(Array.isArray(d.perfumes) ? d.perfumes : []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm(`Удалить «${id}»? Необратимо.`)) return;
    await fetch(`/api/admin/catalog/${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = (items ?? []).filter((p) =>
    `${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-light text-ink-900">Каталог</h1>
        <Link href="/admin/catalog/new" className="btn-primary text-sm">➕ Добавить</Link>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по бренду/названию" className="input-base mb-4" />
      {items === null ? <p className="text-ink-300 text-sm">Загрузка…</p> : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-cream-50 px-3 py-2" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
              {p.images
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.images.split(',')[0].trim()} alt="" className="w-12 h-12 object-cover rounded-lg" />
                : <div className="w-12 h-12 rounded-lg bg-cream-200" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900 truncate">{p.brand} — {p.name}</p>
                <p className="text-xs text-ink-300">{p.inStock ? 'в наличии' : 'нет в наличии'}</p>
              </div>
              <button onClick={() => router.push(`/admin/catalog/${p.id}`)} className="text-xs text-ink-500 hover:text-ink-900">Править</button>
              <button onClick={() => remove(p.id)} className="text-xs text-ink-500 hover:text-ink-900">Удалить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Создать `src/app/admin/catalog/page.tsx`**

```tsx
import CatalogListClient from '@/components/admin/CatalogListClient';
export const dynamic = 'force-dynamic';
export default function CatalogPage() {
  return <CatalogListClient />;
}
```

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`; роуты `/admin/catalog`, `/admin/catalog/new`, `/admin/catalog/[id]`.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/catalog src/components/admin/PerfumeForm.tsx src/components/admin/CatalogListClient.tsx
git commit -m "feat(admin): список каталога + форма создания/правки + фото"
```

---

## Фаза 5 — Дашборд и полировка

### Task 12: Дашборд со счётчиками

**Files:**
- Create or replace: `src/app/admin/page.tsx`

- [ ] **Step 1: Создать `src/app/admin/page.tsx`** (заменить заглушку из Task 6, если была)

```tsx
import Link from 'next/link';
import { countOrdersByStatus, selectPerfumes } from '@/lib/admin/supabase-server';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новые', accepted: 'Принят', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён',
};

export default async function AdminDashboard() {
  let counts: Record<string, number> = {};
  let perfumeCount = 0;
  try {
    counts = await countOrdersByStatus();
    perfumeCount = (await selectPerfumes()).length;
  } catch { /* нет env/сети — покажем нули */ }

  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Дашборд</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">Всего заказов</p>
          <p className="font-display text-3xl font-light text-ink-900">{counts.total ?? 0}</p>
        </div>
        {['new', 'accepted', 'shipped', 'done', 'canceled'].map((s) => (
          <div key={s} className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">{STATUS_LABELS[s]}</p>
            <p className="font-display text-3xl font-light text-ink-900">{counts[s] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">Товаров</p>
          <p className="font-display text-3xl font-light text-ink-900">{perfumeCount}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Link href="/admin/orders" className="btn-outline text-sm">К заказам</Link>
        <Link href="/admin/catalog" className="btn-outline text-sm">К каталогу</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): дашборд со счётчиками заказов и товаров"
```

---

### Task 13: Прогон тестов, финальная сборка, документация env

**Files:**
- Modify: `CLAUDE.md` (раздел про админку — если ведётся; CLAUDE.md в .gitignore, не коммитить)
- Reference only.

- [ ] **Step 1: Прогнать все юнит-тесты**

Run:
```bash
npx tsx --test src/lib/admin/catalog-logic.test.mjs src/lib/admin/session.test.mjs
```
Expected: все тесты PASS (11 шт.).

- [ ] **Step 2: Финальная сборка**

Run: `npm run build`
Expected: `✓ Compiled successfully`; в списке роутов присутствуют все `/admin/*` и `/api/admin/*`, и `ƒ Middleware`.

- [ ] **Step 3: Зафиксировать список env для деплоя**

Убедиться, что в Vercel → Settings → Environment Variables (Production) заданы:
- `ADMIN_PASSWORD` (новый, server-only)
- `ADMIN_SESSION_SECRET` (новый, server-only, длинная случайная строка)
- `SUPABASE_SERVICE_KEY` (тот же service_role, что у Worker'ов — добавить в Vercel)
- `SUPABASE_URL` (уже есть)

Для локального теста добавить те же в `.env.local`.

- [ ] **Step 4: Ручная проверка (локально)**

```bash
npm run build && npm run start
```
Сценарий: открыть `/admin` → редирект на `/admin/login` → ввести `ADMIN_PASSWORD` → попасть на дашборд → зайти в Заказы (список грузится) → Каталог → создать тестовый товар → открыть его на правку → добавить фото → удалить тестовый товар. Выйти (кнопка «Выход») → `/admin` снова редиректит на логин.

- [ ] **Step 5: Commit (если были правки)**

```bash
git add -A
git commit -m "chore(admin): финальная сборка и прогон тестов веб-админки"
```

---

## Фаза 6 — Вывод Telegram админ-бота из эксплуатации

> Выполнять **после** того, как веб-админка проверена и работает (Task 13 пройден).
> До этого момента бот не трогаем — он остаётся запасным каналом на время обкатки.

### Task 14: Удаление кода админ-бота + отключение Worker'а

**Files:**
- Delete: `workers/admin-bot.js`
- Delete: `workers/admin-bot.test.mjs`
- Delete: `workers/wrangler.admin-bot.toml`

- [ ] **Step 1: Убедиться, что логика уже перенесена**

Перенесённые функции живут в `src/lib/admin/catalog-logic.ts` (Task 1), их тесты
зелёные. Бот больше не нужен как источник логики.

Run: `npx tsx --test src/lib/admin/catalog-logic.test.mjs`
Expected: PASS.

- [ ] **Step 2: Отключить Worker в Cloudflare (ручной шаг, до удаления конфига)**

Снять webhook бота и удалить Worker (нужен `ADMIN_BOT_TOKEN` из env Worker'а):
```bash
# 1) снять webhook (чтобы Telegram перестал слать апдейты)
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/deleteWebhook"
# 2) удалить сам Worker (пока конфиг ещё есть)
npx wrangler delete -c workers/wrangler.admin-bot.toml
```
Альтернатива удалению Worker'а — Cloudflare Dashboard → Workers & Pages →
`admin-bot` → Settings → Delete.

Expected: `deleteWebhook` вернёт `{"ok":true,"result":true,...}`; `wrangler delete`
подтвердит удаление.

> Если доступа к `ADMIN_BOT_TOKEN`/Cloudflare сейчас нет — этот шаг можно
> выполнить позже вручную; удаление файлов из репо (Step 3) от него не зависит.

- [ ] **Step 3: Удалить файлы бота из репозитория**

```bash
git rm workers/admin-bot.js workers/admin-bot.test.mjs workers/wrangler.admin-bot.toml
```

- [ ] **Step 4: Проверить, что ничего на бота не ссылается**

Run:
```bash
grep -rn "admin-bot" --include="*.js" --include="*.ts" --include="*.mjs" --include="*.json" . | grep -v node_modules
```
Expected: только упоминания в `docs/` (история/спеки) — кода-ссылок быть не должно.
`package.json` тестовый скрипт (если ссылался на `workers/admin-bot.test.mjs`) —
поправить, чтобы не указывал на удалённый файл.

- [ ] **Step 5: Финальная сборка и тесты**

Run: `npm run build && npx tsx --test src/lib/admin/*.test.mjs && node --test workers/order-webhook.test.mjs`
Expected: сборка `✓`; тесты админки PASS; тесты Worker заказов PASS (бот не ломает их — он изолирован).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: вывод Telegram админ-бота каталога из эксплуатации (код удалён)"
```

> Документация: раздел про админ-бота в `CLAUDE.md` пометить устаревшим/удалить
> вручную (CLAUDE.md в `.gitignore`, не коммитится). Таблицу `admin_sessions`
> (`supabase/002_admin.sql`) можно оставить — она не мешает; дроп при желании
> отдельным разовым SQL.

---

## Self-review (выполнено при написании плана)

**Покрытие спека:**
- Авторизация (один пароль, cookie, middleware) → Tasks 2, 4, 5, 6 ✓
- Структура/маршруты → Tasks 4–12 ✓
- Заказы (список/детали инлайн, фильтр/поиск, статус, note) → Tasks 7, 8 ✓
- Каталог (полный CRUD + фото, slug, season/occasion, ревалидация) → Tasks 1, 9, 10, 11 ✓
- Дашборд → Task 12 ✓
- Безопасность (server-only, service_role не в браузере) → Tasks 3, 5 ✓
- Тесты чистых функций + сессии → Tasks 1, 2 ✓
- Вывод Telegram админ-бота из эксплуатации (удаление кода + отключение Worker'а) → Task 14 ✓
- Worker заказов (`order-webhook.js`) не трогается → подтверждено в Task 14 Step 5 ✓

**Тип-консистентность:** `PerfumeDraft`, `draftToPerfumeRow`, `validateField`, `signSession`/`verifySession`, `SESSION_COOKIE`, обёртки `supabase-server` — имена совпадают во всех тасках, где используются.

**Плейсхолдеры:** код приведён полностью в каждом шаге; «не входит в MVP» зафиксировано в спеке, не в коде.
