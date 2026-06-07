# Дизайн: система заказов с Telegram-CRM и учётом в Airtable

**Дата:** 2026-06-07
**Статус:** утверждён, готов к написанию плана

## Контекст и проблема

Сейчас заказ — это **лид-форма**. Сайт (`OrderModal` для одиночного товара, `CartCheckoutModal` для корзины) собирает имя + контакт и шлёт POST на Cloudflare Worker (`workers/order-webhook.js`), который отправляет текстовое сообщение в Telegram-чат менеджеру. Дальше менеджер всё делает вручную; fallback при недоступности webhook — открыть `t.me/...?text=...`.

Боли (со слов владельца):
- **Ручная обработка** — менеджер вручную ведёт каждый заказ.
- **Нет учёта заказов** — заказы живут только как сообщения в чате: нет списка, статусов, истории, аналитики.
- **Слабый UX** на экране завершения заказа.

Решения, которые НЕ входят в этот этап (явно отвергнуты при брейншторме):
- Онлайн-оплата — оплата остаётся вне системы (перевод/наличными).

## Цель

Превратить заказ из «сообщения в чат» в **запись со статусом**, которой менеджер управляет в один тап прямо из Telegram, при этом:
- заказы накапливаются в Airtable (учёт, история, суммы);
- статус заказа меняется кнопками в чате и зеркалится в Airtable;
- экран завершения заказа на сайте становится понятнее (номер заказа + явные «что дальше»).

Выбранный подход — **Вариант A**: расширить существующий Worker, использовать Airtable как хранилище, Telegram-бот с inline-кнопками как CRM. Без отдельного сервиса.

## Архитектура и поток данных

```
Сайт (OrderModal / CartCheckoutModal)
   │  POST { order payload }   ← схема payload почти не меняется
   ▼
Cloudflare Worker  (один воркер, два маршрута)
   │
   ├─ [маршрут 1] POST /  (заказ с сайта)
   │     1. CORS / method check        (как сейчас)
   │     2. validatePayload            (как сейчас + type, total для cart)
   │     3. airtableCreate → recordId, orderNumber  (НОВОЕ; при ошибке не прерываем)
   │     4. sendMessage с inline-кнопками (recordId в callback_data)
   │     5. return { ok:true, orderNumber }
   │
   └─ [маршрут 2] POST /tg  (callback от Telegram, привязан через setWebhook)
         1. assert X-Telegram-Bot-Api-Secret-Token === TELEGRAM_WEBHOOK_SECRET
         2. body.callback_query? иначе 200 ok (игнор прочих апдейтов)
         3. parse callback_data "s:<recordId>:<status>"
         4. airtablePatch(recordId, { status })
         5. editMessageText / editMessageReplyMarkup (статус + обновлённые кнопки)
         6. answerCallbackQuery (тост менеджеру)
```

**Ключевые свойства:**
- Один Worker, два пути: `POST /` (существует) и `POST /tg` (новый). Бот привязывается к `/tg` через `setWebhook` (разовая ручная настройка).
- **Airtable = источник правды по статусу.** Сообщение в чате — зеркало, редактируется при смене статуса.
- **Деградация без потери лида.** Если Airtable недоступен — заказ всё равно уходит в чат (без кнопок-статусов), сайт показывает успех без номера. Текущий клиентский fallback на `t.me/...` при недоступности Worker сохраняется.
- Секреты Worker (server-only, в клиентский бандл не попадают): существующие `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` + новые `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_ORDERS_TABLE` (=`Orders`), `TELEGRAM_WEBHOOK_SECRET`.

## Схема Airtable: таблица `Orders`

Новая таблица в той же базе, что и `Catalog`. Одна запись = один заказ. Состав заказа хранится **текстом в одном поле** (вторую таблицу позиций не заводим — для учёта и статусов достаточно).

| Поле | Тип | Заполняет | Назначение |
|---|---|---|---|
| `orderNumber` | Autonumber | Airtable | Человекочитаемый № заказа (показываем клиенту и в чате) |
| `status` | Single select | Worker | `new` · `accepted` · `shipped` · `done` · `canceled` |
| `customerName` | Text | Worker | Имя из формы / TG-профиля |
| `contact` | Text | Worker | @username или телефон |
| `items` | Long text | Worker | Состав читаемым текстом (бренд — аромат, объём ×кол-во — цена), по строке на позицию |
| `total` | Number | Worker | Сумма заказа, ₽ |
| `type` | Single select | Worker | `single` · `cart` · `consultation` |
| `source` | Text | Worker | результат `detectSource()` — utm/referrer/direct/telegram |
| `pageUrl` | URL | Worker | Страница, с которой заказали |
| `tgUserId` | Text | Worker | Telegram user id (если заказ из Mini App) — для будущей привязки |
| `createdAt` | Created time | Airtable | Время заказа |
| `note` | Long text | менеджер | Свободные заметки менеджера (единственное поле для ручного ввода) |

- `orderNumber` (Autonumber) генерит Airtable; Worker читает его из ответа `createRecord` и возвращает сайту.
- `status` управляется кнопками из чата.
- Маппинг с текущим payload почти 1:1 — новых данных с сайта собирать не нужно.
- Поле адреса/города НЕ добавляем: в форме его сейчас нет (YAGNI).

## Worker: маршруты и детали

### Маршрут 1 — `POST /` (доработка существующего)

1. CORS / method check — как сейчас.
2. `validatePayload` — как сейчас, плюс учесть `type` и `total` для корзины.
3. `airtableCreate(payload)` — **новое**: `POST` в Airtable `Orders`, `status="new"` → `{ recordId, orderNumber }`. При ошибке: `orderNumber=null`, лог, **не прерываем**.
4. `sendMessage(text, keyboard)` — текст как сейчас, расширенный (см. ниже) + inline-кнопки:
   - `[✅ Принят] [📦 Отправлен]` / `[✔️ Выполнен] [✖️ Отмена]`
   - `callback_data = "s:<recordId>:<status>"`
   - если `recordId` нет — отправить без кнопок (деградация).
5. `return { ok:true, orderNumber }`.

### Маршрут 2 — `POST /tg` (новый)

1. Проверить заголовок `X-Telegram-Bot-Api-Secret-Token === env.TELEGRAM_WEBHOOK_SECRET`, иначе `401` (только Telegram может вызывать).
2. Если в теле нет `callback_query` — вернуть `200 ok` (игнор прочих апдейтов).
3. Разобрать `callback_data` → `{ recordId, status }`.
4. `airtablePatch(recordId, { status })`.
5. `editMessageText`: исходный текст + строка `Статус: <эмодзи> <Принят>`; `reply_markup` — подсветить активный статус (или убрать кнопки на `done`/`canceled`). `chat_id` + `message_id` берём из `callback_query.message`.
6. `answerCallbackQuery("Статус: Принят")` — тост менеджеру.

### Детали реализации

- `callback_data` ≤ 64 байт: `s:recXXXXXXXXXXXXXX:accepted` укладывается (Airtable recordId = 17 символов).
- Идемпотентность: повторный тап того же статуса → тот же patch, сообщение перерисуется тем же. Безопасно.
- Ошибка Airtable в callback → `answerCallbackQuery("Не удалось обновить, попробуйте ещё")`, сообщение не трогаем.
- `formatTelegramMessage` расширяем: для `cart` — список позиций + Итого; во всех типах — `№ заказа`.

### Разовая настройка (вне кода, документируется в CLAUDE.md / README воркера)

- `setWebhook` бота на `https://<worker>/tg` с `secret_token = TELEGRAM_WEBHOOK_SECRET`.
- Добавить env Worker: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_ORDERS_TABLE`, `TELEGRAM_WEBHOOK_SECRET`.

## Изменения на сайте (UX)

### Payload (минимальные правки)

- `OrderModal`: нормализовать `type: 'single' | 'consultation'` (переиспользовать существующий `messageType`).
- `CartCheckoutModal`: payload уже несёт `items`, `total`, `messageType: 'cart-order'` → нормализовать `type: 'cart'`.
- Ответ Worker теперь `{ ok, orderNumber }` — сайт читает `orderNumber`.

### Экран успеха (обе модалки)

- Заголовок: **«Заявка №<orderNumber> принята»** (если номер пришёл; иначе — без номера, как сейчас).
- Явные шаги «что дальше»:
  1. Менеджер свяжется в Telegram / по телефону для подтверждения.
  2. Оплата — после подтверждения (перевод / при встрече).
- Кнопка **«Написать менеджеру»** (диплинк `t.me`) — клиент может ускорить сам.

## Обработка ошибок (приоритет — не терять лид)

| Сбой | Поведение |
|---|---|
| Airtable down, чат жив | Заказ в чат без кнопок-статусов; сайт — успех без номера. Лид цел. |
| Webhook (Worker) недоступен | Текущий клиентский fallback: открыть `t.me/...?text=<состав>`. Без изменений. |
| Callback Airtable-patch упал | Тост менеджеру «не удалось», сообщение не меняется, можно повторить. |
| Двойной тап статуса | Идемпотентно — повтор того же patch, без дублей. |

## Вне рамок (YAGNI)

- Онлайн-оплата.
- Вторая таблица позиций (`OrderItems`).
- Отдельный бот-сервис с командами (`/orders`, `/today`, статистика) — Вариант C; можно нарастить позже поверх этого.
- Поле адреса/города (в форме нет).
- Статус-страница заказа для клиента (клиента ведёт менеджер).

## Тестирование

Тестов в проекте нет; проверка — `npm run build` (TypeScript) + ручной прогон.

- `npm run build` проходит.
- Ручной прогон: одиночный заказ и заказ-корзина → запись в Airtable появилась; сообщение с кнопками пришло; тап каждой кнопки меняет `status` и редактирует сообщение; показывается тост.
- Деградация: временно сломать Airtable-ключ → заказ всё равно уходит в чат, сайт показывает успех.

## Затрагиваемые файлы

- `workers/order-webhook.js` — два маршрута, Airtable create/patch, inline-кнопки, callback-обработка, расширенный формат сообщения.
- `src/components/OrderModal.tsx` — `type` в payload, экран успеха с номером.
- `src/components/CartCheckoutModal.tsx` — `type` в payload, экран успеха с номером.
- `src/types/index.ts` — расширить `OrderPayload` / `CartOrderPayload` (`type`), тип ответа `{ ok, orderNumber }`.
- `CLAUDE.md` — обновить раздел «Корзина и заявки» + env Worker + `setWebhook`.
- Airtable — новая таблица `Orders` (ручная настройка, документируется).
