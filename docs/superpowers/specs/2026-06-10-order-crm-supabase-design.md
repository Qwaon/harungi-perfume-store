# Дизайн: перенос Order CRM на Supabase (этап 3 миграции)

**Дата:** 2026-06-10
**Статус:** дизайн утверждён, готов к написанию плана
**Зависит от:** этап 1 (каталог в Supabase, таблица `perfumes`), этап 2 (Supabase-инфра, паттерн Worker).
**Роадмап:** `docs/superpowers/specs/2026-06-07-supabase-migration-roadmap.md` (этап 3).
**Текущая реализация CRM:** `docs/superpowers/specs/2026-06-07-order-crm-design.md`, `workers/order-webhook.js`.

## Цель

Перенести заказы и историю с Airtable `Orders` + Telegram CloudStorage на Supabase.
Заказы хранятся нормализованно (`orders` + `order_items` с FK на `perfumes`).
История в Mini App читается из Supabase по проверенному `tgUserId`.

## Утверждённые решения (брейншторм 2026-06-10)

| Развилка | Решение |
|---|---|
| Схема заказов | Нормализованно: `orders` + `order_items`, FK на `perfumes` |
| Снимок позиции | `order_items` хранит название/бренд/объём/цену на момент заказа (история не «плывёт») |
| История Mini App | Читается из Supabase по `tgUserId` |
| Доступ к истории | Через Worker с проверкой Telegram initData (HMAC) — service-ключ на сервере |
| Переход webhook | Чистая замена Airtable→Supabase, фолбэк-механика сохраняется (лид не теряется) |
| Старые заказы Airtable | НЕ мигрируем — остаются в Airtable для справки, Supabase с чистого листа |
| CloudStorage история | Убираем запись (`appendOrder`), источник истории — Supabase |

## Схема данных (новое в Supabase) — `supabase/003_orders.sql`

```sql
-- Заголовок заказа
create table orders (
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
  note          text,                                 -- ручные заметки менеджера
  created_at    timestamptz default now()
);

-- Позиции заказа (нормализация + снимок на момент заказа)
create table order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references orders(id) on delete cascade,
  perfume_id   text references perfumes(id) on delete set null,  -- мягкая ссылка
  perfume_name text,
  brand        text,
  volume       text,
  quantity     int default 1,
  price        numeric                                -- цена за штуку на момент заказа
);

-- RLS: обе таблицы включены БЕЗ публичных политик — доступ только service_role (Worker).
alter table orders enable row level security;
alter table order_items enable row level security;
```

- `order_items` хранит **снимок** (название/бренд/объём/цену) — история не меняется при правке/удалении аромата.
- `perfume_id` — мягкая ссылка (`on delete set null`): удаление аромата (этап 2) не ломает историю.
- `id` для FK/callback, `order_number` — для менеджера. Обе identity считаются
  независимо с 1, поэтому на старте их значения совпадают — это не баг; разнесены
  логически, чтобы `order_number` можно было позже задать своим seed/форматом.

## Переписывание `order-webhook.js` (приём заказа)

Меняется **только слой хранения**. Telegram-часть (отправка в чат, inline-кнопки
статуса, фолбэк на `t.me`, формат сообщения, клавиатура) — без изменений.

- `createAirtableOrder()` → `createSupabaseOrder()`: POST в `orders` (вернёт
  `id` + `order_number`), затем **один** POST массивом в `order_items`.
- `patchAirtableStatus()` → `patchSupabaseStatus()`: PATCH `status` в `orders` по `id`.
- `callback_data` остаётся `s:<id>:<status>`, но `<id>` теперь Postgres bigint.

### Обработка частичного сбоя

- Вставка `orders` упала → заказ всё равно уходит в чат (без номера/кнопок),
  фолбэк работает, лид не теряется. `createSupabaseOrder` возвращает `null`.
- `orders` вставлен, часть/все `order_items` упали → заказ существует с номером,
  кнопки статуса работают. Логируем, **не откатываем** — заказ с номером важнее
  потерянного. Состав в чат уходит из payload напрямую, менеджер видит всё.
- Позиции вставляются **одним** POST-запросом (массив объектов) — атомарно на
  уровне запроса, без N сетевых вызовов.

### Сохраняется без изменений

Маршрут `/tg` (callback статусов), защита `X-Telegram-Bot-Api-Secret-Token`,
фолбэк на `t.me` при недоступности webhook, формат сообщения, клавиатура статусов.

## Чтение истории в Mini App — новый маршрут `POST /history`

В том же Worker'е (`order-webhook.js`).

**Поток:**
1. Mini App шлёт `POST /history` с `{ initData: "<сырая Telegram.WebApp.initData>" }`.
2. Worker проверяет подпись: `secret = HMAC_SHA256("WebAppData", bot_token)`,
   сверяет `hash` из initData (схема Telegram). Подтверждает подлинность `user.id`.
3. Проверка свежести: `auth_date` не старше 24ч (защита от реиграния).
4. По проверенному `tg_user_id` запрашивает `orders` + `order_items` (service-ключ).
5. Возвращает JSON истории со статусами.

**Безопасность:** `tgUserId` извлекается из подписанного initData (не из
произвольного поля). Service-ключ только на Worker'е, браузер БД не видит. CORS —
`ALLOWED_ORIGIN` (как для приёма заказов).

**Клиент (`src/lib/orderHistory.ts`):**
- `readOrders()` → `fetch('<webhook>/history', { initData })` вместо CloudStorage.
- `appendOrder()` — удаляется: заказ уже в Supabase через webhook.
- Грейсфул: `/history` недоступен → пустая история с пометкой «не удалось
  загрузить», без падения.

## Env Worker'а (`order-webhook.js`)

- **Добавить:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (тот же service-ключ).
- **Удалить после стабилизации:** `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`,
  `AIRTABLE_ORDERS_TABLE`.
- **Остаются:** `TELEGRAM_BOT_TOKEN` (отправка + проверка initData HMAC),
  `TELEGRAM_CHAT_ID`, `ALLOWED_ORIGIN`, `TELEGRAM_WEBHOOK_SECRET`.

## Краевые случаи

- Аромат удалён из каталога → `order_items.perfume_id` = null, снимок цел.
- `order_number` и `id` — обе identity; `id` для FK/callback, `order_number` для менеджера.
- Протухший `auth_date` в initData → 401.
- Двойное нажатие статуса → PATCH идемпотентен.
- Старые заказы Airtable не мигрируются (Supabase с чистого листа).

## Тестирование

**Чистые функции — `workers/order-webhook.test.mjs` (`node --test`):**
- `verifyInitData(initData, botToken)` → `{ ok, userId }` — проверка HMAC Telegram.
  Тесты: валидная подпись → ok+userId; искажённый hash → fail; протухший
  auth_date → fail. Фикстура — пример из доков Telegram.
- `buildOrderRows(payload)` → `{ order, items[] }` — маппинг single/cart/
  consultation в строки. Тесты: три типа, снимок цен/количеств.
- `parseStatusCallback(data)` → `{ id, status }` — разбор `s:<id>:<status>`.

**Ручной чеклист после деплоя:**
1. Одиночный заказ → чат с номером + кнопки → строка в `orders` + 1 в `order_items`.
2. Заказ-корзина (2+ позиции) → несколько строк в `order_items`.
3. Кнопки статуса → меняется `orders.status`, сообщение редактируется.
4. Консультация → `type=consultation`.
5. История в Mini App → свои заказы со статусами.
6. Поддельный initData в `/history` → 401.
7. Недоступность Supabase → заказ уходит в чат (фолбэк), сайт показывает успех.

## Деплой (разово, владелец)

1. Прогнать `supabase/003_orders.sql` в SQL Editor.
2. Добавить `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` в env Worker'а заказов.
3. Передеплоить `order-webhook.js`. Маршрут `/tg` уже привязан — не меняется.

## Вне рамок этапа 3

Миграция исторических заказов из Airtable. Удаление Airtable-переменных (после
стабилизации). Аналитические вьюхи по продажам (Supabase позволяет — отдельно).

## Связанные документы

- Роадмап: `docs/superpowers/specs/2026-06-07-supabase-migration-roadmap.md`
- CRM на Airtable (текущая): `docs/superpowers/specs/2026-06-07-order-crm-design.md`
- Worker: `workers/order-webhook.js`. Паттерн тестов: `workers/admin-bot.test.mjs`.
- Типы payload: `src/types/index.ts` (`OrderPayload`, `CartOrderPayload`, `CartItem`).
