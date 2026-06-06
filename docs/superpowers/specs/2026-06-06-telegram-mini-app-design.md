# HARUNGI — Telegram Mini App (раздел «Аккаунт»)

**Дата:** 2026-06-06
**Статус:** утверждён к реализации
**Подход:** Вариант A — тонкая обёртка поверх текущего сайта, без своего бэкенда и БД

## Цель

Превратить существующий мобильный сайт HARUNGI в Telegram Mini App «точь-в-точь как сайт»,
добавив раздел «Аккаунт» с профилем, историей заказов и избранным. Один кодовый базис,
один деплой (Vercel). Внутри Telegram появляется раздел «Аккаунт»; в обычном браузере сайт
работает как сейчас, раздел «Аккаунт» скрыт.

## Ключевые решения (зафиксированы с пользователем)

- **Хранилище** — Telegram **CloudStorage** (key-value, привязан к боту). Своего бэкенда и БД нет.
- **Авторизация** — Telegram `initData` / `initDataUnsafe` (без паролей). Серверная валидация
  подписи для MVP **не требуется**, т.к. данные пользователя живут только на его устройстве
  (подделывать нечего — он видит лишь свои данные).
- **Заказы** по-прежнему уходят в существующий Cloudflare Worker → Telegram-сообщение.
  Worker **не меняется**.
- **История заказов — без статусов**: просто список «что и когда заказывал».
- **Вне Telegram** раздел «Аккаунт» скрыт; всё остальное работает как сейчас (localStorage).
- **Палитра HARUNGI** (cream/ink/gold) сохраняется; тема Telegram под UI **не** подменяется.
- **Хостинг** — Vercel (автодеплой при push в `main`).

## Ограничения выбранного подхода (приняты осознанно)

- Магазин **не видит** заказы в единой таблице — только Telegram-сообщения, как сейчас.
- История привязана к аккаунту Telegram + боту; смена аккаунта/переустановка → возможна потеря.
- CloudStorage: до 1024 ключей, **≤4096 байт на значение**, ключи `[A-Za-z0-9_-]`, ≤128 симв.
  Историю храним компактно и капим до **50** последних заказов.

## Архитектура

Добавляется один новый клиентский слой. Источник правды каталога (`src/data/perfumes.json`)
и Worker-webhook не меняются. Каталог остаётся SSG.

```
src/
├── contexts/
│   ├── TelegramContext.tsx   ← НОВЫЙ: профиль (user), isTelegram, ready/expand, тема (только рамка)
│   ├── CartContext.tsx       ← ПРАВКА: чтение/запись через lib/storage (async)
│   └── FavoritesContext.tsx  ← НОВЫЙ: промоут текущего useFavorites в провайдер, хранилище через lib/storage
├── lib/
│   ├── storage.ts            ← НОВЫЙ: адаптер CloudStorage | localStorage (Promise-обёртка)
│   └── orderHistory.ts       ← НОВЫЙ: appendOrder / readOrders, компактный формат, кап 50
├── app/
│   └── account/page.tsx      ← НОВЫЙ: раздел Аккаунт (в браузере — заглушка «Доступно в Telegram»)
└── components/
    ├── TelegramProvider.tsx  ← НОВЫЙ: <Script telegram-web-app.js> + TelegramContext
    ├── BottomNav.tsx         ← ПРАВКА: 4-я вкладка «Аккаунт» только в Telegram
    ├── ProductCard.tsx       ← ПРАВКА: кнопка-тогл «избранное» (♥), 44px, aria-label
    ├── ProductPageClient.tsx ← ПРАВКА: кнопка-тогл «избранное»
    ├── OrderModal.tsx        ← ПРАВКА: appendOrder после success (только в Telegram)
    ├── CartCheckoutModal.tsx ← ПРАВКА: appendOrder после success (только в Telegram)
    └── account/              ← НОВЫЕ: AccountProfile, OrderHistory, FavoritesGrid, SupportLinks
```

### `TelegramContext`

- Грузит официальный `https://telegram.org/js/telegram-web-app.js` через `next/script`
  (`strategy="afterInteractive"`) в `TelegramProvider`.
- `isTelegram`: `boolean | undefined` (undefined = ещё не определились; для скелетонов).
  Определяется по непустому `window.Telegram?.WebApp?.initData`.
- При наличии WebApp: вызывает `ready()`, `expand()`.
- Отдаёт `user`: `{ id, firstName, lastName?, username?, photoUrl? }` из `initDataUnsafe.user`.
- Тема Telegram применяется **только** к цвету шапки/рамки (`setHeaderColor`), палитра контента
  остаётся HARUNGI.
- `BackButton`: показывается на внутренних страницах (товар, бренд), скрыт на корневых вкладках.
- Весь код клиентский, с guard `typeof window !== 'undefined'`.

### `lib/storage.ts` (адаптер хранилища)

Единый асинхронный интерфейс:

```ts
storageGet(key: string): Promise<string | null>
storageSet(key: string, value: string): Promise<void>
storageRemove(key: string): Promise<void>
```

- Бэкенд выбирается один раз при инициализации, **синхронно** по `window.Telegram?.WebApp`
  (не через React-контекст — избегаем гонок).
- Внутри Telegram при `WebApp.isVersionAtLeast('6.9')` → `WebApp.CloudStorage`
  (колбэки оборачиваются в Promise). Иначе (старый клиент или браузер) → `localStorage`
  (тоже завёрнут в Promise для единообразия интерфейса).
- Ключи CloudStorage: `cart`, `favorites`, `orders`.
- Текущие localStorage-ключи сохраняются: `harungi-cart`, `parfum_favorites`.

**Миграция (одноразовая, при первом запуске в Telegram):** если CloudStorage по ключу пуст,
а соответствующий localStorage-ключ непуст — переносим значение в CloudStorage. Делается для
`cart` (из `harungi-cart`) и `favorites` (из `parfum_favorites`). Ставим флаг-маркер, чтобы
не повторять.

### `lib/orderHistory.ts`

Компактный формат записи (минимизируем байты под лимит 4 КБ):

```ts
interface StoredOrder {
  id: string;          // timestamp-based id
  ts: string;          // ISO дата
  items: [string, Volume, number, number][]; // [perfumeId, volume, qty, price]
  total: number;
  type: 'order' | 'cart-order';
}
```

- `appendOrder(order)`: читает `orders`, добавляет в начало, обрезает до 50, пишет обратно.
  Обёрнут в try/catch — **ошибка не должна ронять оформление заказа** (заявка уже отправлена).
- `readOrders(): Promise<StoredOrder[]>`.
- Для отображения позиций имена/бренды резолвятся из `perfumes.json` по `perfumeId` на странице
  Аккаунта (в хранилище имена не дублируем — экономия места; для отсутствующих id — фолбэк-текст).

### `CartContext` (правка)

- Загрузка становится async: `useEffect` вызывает `storageGet('cart' | 'harungi-cart')`,
  затем `setItems(sanitizeStoredItems(...))`. Добавляется состояние `hydrated: boolean`.
- До гидратации корзина рендерится пустой (как сейчас на первом кадре).
- Существующая защита `skipNextPersist` (ref) сохраняется: первый persist пропускается.
- Запись: `storageSet('cart', JSON.stringify(items))` (await, без дебаунса — правки редкие).
- `sanitizeStoredItems` остаётся без изменений.

### `FavoritesContext` (новый)

- Промоут текущего `hooks/useFavorites.ts` в провайдер (сейчас он dead code).
- Хранилище через `lib/storage` (`favorites`). API: `{ favorites, toggle, isFavorite, hydrated }`.
- Оборачивается в `layout.tsx` рядом с `CartProvider`.

## Раздел «Аккаунт» (UI)

Стиль — как текущий сайт: cream-фон, `font-display` заголовки, карточки с
`box-shadow: 0 0 0 1px #e8e6dc`, палитра ink/gold, тач-таргеты ≥44px, `aria-label` на иконках.

**Навигация:** `BottomNav` внутри Telegram показывает 4-ю вкладку «Аккаунт» (иконка профиля).
Вне Telegram — 3 вкладки как сейчас. Роут `/account` существует всегда; вне Telegram при прямом
заходе — заглушка «Доступно в Telegram».

**Страница `/account` сверху вниз:**

1. **Профиль** — аватар (`photoUrl`; фолбэк — первая буква имени в gold-кружке), имя
   (`firstName lastName`), `@username` мелким `ink-300` (строка скрыта, если username нет).
2. **История заказов** — карточки: дата, позиции (бренд — название, объём ×кол-во), итог.
   Тап раскрывает состав (аккордеон в стиле существующего `FAQItem`). Пусто → «Здесь появятся
   ваши заказы». До загрузки — скелетоны (не «пусто»).
3. **Избранное** — сетка существующих `ProductCard` по сохранённым id. Пусто → «Сохраняйте
   ароматы, нажимая ♥».
4. **Поддержка** — ссылка на Telegram-чат (`TELEGRAM_URL`), ссылки на FAQ/доставку.

**Кнопка «избранное»** добавляется на `ProductCard` и `ProductPageClient`: иконка-сердце,
тач-таргет 44px (`w-11 h-11`), `aria-label="В избранное" / "Убрать из избранного"`,
`:focus-visible` через глобальные стили (не ставить `focus:outline-none`).

**Запись в историю:** в `OrderModal` и `CartCheckoutModal` после `setStatus('success')`
вызывается `appendOrder(...)` — только когда `isTelegram`. Данные берутся из уже собранного
payload. Worker не трогаем.

## Telegram-нативность (минимально, без переусложнения)

- `MainButton` Telegram — **не используем** по умолчанию (кастомные кнопки — чтобы UI совпадал
  с сайтом). Возможное улучшение на потом.
- Тема: только цвет шапки/рамки через `setHeaderColor`; контент — палитра HARUNGI.
- `BackButton` Telegram — на внутренних страницах.
- `viewport-fit=cover` и safe-area уже есть в проекте — переиспользуем.

## Edge-кейсы

- **CloudStorage недоступен** (клиент < 6.9): фолбэк на localStorage даже внутри Telegram.
- **Нет `photoUrl`/`username`**: фолбэк-аватар, строка username скрыта.
- **Гонка гидратации:** `/account` ждёт `isTelegram !== undefined` и завершения чтения истории —
  показывает скелетоны, чтобы не мигало «нет заказов».
- **`appendOrder` не роняет оформление:** try/catch, ошибка только логируется.
- **SSR:** весь Telegram-код клиентский (`'use client'`, guard на `window`), скрипт
  `afterInteractive`. Каталог — SSG без изменений.

## Тестирование

Тестов в проекте нет; основная проверка — сборка + ручная.

- `npm run build` — TypeScript и сборка проходят.
- Вне Telegram: всё как раньше, вкладки «Аккаунт» нет, `/account` → заглушка.
- Внутри Telegram: настроить Mini App URL в @BotFather на Vercel-домен; открыть бота на телефоне
  (либо web.telegram.org с тестовым ботом).
- Чек-лист в Telegram: профиль подтянулся; заказ записался в историю; избранное синхронизируется;
  корзина переживает перезапуск Mini App; миграция из localStorage сработала разово.

## Настройка бота (разовая, вне кода)

- @BotFather: `/newapp` или `/setmenubutton` → URL Mini App (Vercel-домен).

## ⚠️ Безопасность токена

Токен бота, присланный в чат, **не должен попадать в репозиторий или клиентский бандл**.
Для варианта A токен в коде фронтенда **не нужен** вообще (он требуется только Worker'у при
возможной будущей серверной валидации). **Рекомендация:** перевыпустить токен через
@BotFather (`/revoke`), раз он засветился в переписке.

## Что НЕ входит в этот спек (YAGNI / на будущее)

- Серверная валидация `initData` и зеркало заказов в БД (вариант B).
- Статусы заказов и их обновление (требует бэкенда).
- `MainButton`/нативная тема Telegram под весь UI.
- Аналитика событий аккаунта сверх существующего `trackEvent`.
