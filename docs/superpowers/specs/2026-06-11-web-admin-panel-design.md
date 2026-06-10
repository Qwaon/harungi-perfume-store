# Веб-админка HARUNGI — дизайн

Дата: 2026-06-11

## Цель

Перенести управление магазином из Telegram-бота в удобную **веб-админку** на том
же сайте (`/admin`): полный CRUD каталога (паритет с ботом, но на удобных формах)
плюс новый раздел «Заказы» (список, фильтр/поиск, смена статуса, примечания).

Telegram админ-бот **остаётся** (пишет в ту же Supabase) как быстрый доступ с
телефона; веб-админка становится основным инструментом. Публичный сайт и приём
заказов не затрагиваются.

## Архитектура (подход A)

`/admin` — раздел того же Next.js-проекта. Запись в Supabase идёт через
**серверные Route Handlers** под `service_role` (обходит RLS). `service_role`-ключ
**никогда** не попадает в браузер. Доступ закрыт `middleware` по подписанной
cookie-сессии.

```
Браузер (формы) ──► /api/admin/* (Route Handler, server-only) ──► Supabase (service_role)
        ▲                         ▲
        │                         │
   cookie admin_session     middleware проверяет cookie на /admin/* и /api/admin/*
```

### Почему A, а не альтернативы

- **B (запись в Cloudflare Worker, сайт только UI)** — тянет инфраструктуру в
  Worker (CORS, дубль маршрутов, два места деплоя). Противоречит выбору «`/admin`
  на сайте».
- **C (клиент пишет напрямую под Supabase Auth + RLS-политики на запись)** —
  выбран «один пароль», а не Supabase Auth; писать полный набор write-политик —
  заметная работа и риск дырки. Избыточно для 1–2 админов.

## Секция 1 — Авторизация и защита доступа

### Логин (один общий пароль)

- `/admin/login` — форма с одним полем «пароль».
- Пароль сверяется на сервере с env `ADMIN_PASSWORD` (server-only). Сравнение —
  **константное по времени** (защита от timing-атак).
- При успехе сервер ставит подписанную **httpOnly**-cookie `admin_session`.
  Подпись — HMAC-SHA256 на серверном секрете `ADMIN_SESSION_SECRET`; внутри —
  срок годности (**7 дней**). Атрибуты: `httpOnly`, `Secure`, `SameSite=Lax`.

### Middleware (`src/middleware.ts`)

- Матчит `/admin/:path*` и `/api/admin/:path*`.
- Проверяет валидность и свежесть подписи cookie. Нет/протухла/битая → для
  страниц `redirect('/admin/login')`, для API — `401 JSON`.
- Исключения (доступны без cookie): `/admin/login`, `/api/admin/login`.

### Безопасность

- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SUPABASE_SERVICE_KEY` — server-only
  env (без `NEXT_PUBLIC_`), в Vercel Production.
- Cookie подписана HMAC — подделать нельзя; httpOnly — не читается из JS.
- Middleware закрывает разом UI-страницы и API-маршруты (которые держат
  service_role).

### Env (новые)

| Переменная | Назначение |
|---|---|
| `ADMIN_PASSWORD` | общий пароль входа в `/admin` |
| `ADMIN_SESSION_SECRET` | секрет для HMAC-подписи cookie-сессии |
| `SUPABASE_SERVICE_KEY` | уже есть у Worker'ов; добавить в Vercel env для Route Handlers |

### Вне MVP

Rate-limit логина (полагаемся на длинный случайный пароль) — отмечено как
возможное расширение.

## Секция 2 — Структура и маршруты

### Страницы (`src/app/admin/`)

```
/admin/login           — форма пароля (публичная, вне middleware-защиты)
/admin                 — дашборд: счётчики (заказы по статусам, всего товаров) + ссылки
/admin/orders          — список заказов: фильтр по статусу, поиск, смена статуса, note
/admin/catalog         — список товаров: поиск, флаги, «Добавить», переход к правке
/admin/catalog/new     — форма создания товара (все поля + фото)
/admin/catalog/[id]    — форма правки товара (все поля + фото + удаление)
```

### API (`src/app/api/admin/`) — Route Handlers, service_role, под middleware

```
POST   /api/admin/login              — проверка пароля, выдача cookie
POST   /api/admin/logout             — сброс cookie
GET    /api/admin/orders             — список (фильтр/поиск в query)
PATCH  /api/admin/orders/[id]        — смена status / правка note
GET    /api/admin/catalog            — список товаров
POST   /api/admin/catalog            — создать товар
PATCH  /api/admin/catalog/[id]       — обновить поля товара
DELETE /api/admin/catalog/[id]       — удалить товар (+ его фото)
POST   /api/admin/catalog/[id]/photo — загрузить фото в Storage
DELETE /api/admin/catalog/[id]/photo — очистить фото
```

### Серверный Supabase-клиент (`src/lib/admin/supabase-server.ts`)

Единственное место использования `SUPABASE_SERVICE_KEY`. Файл помечен
`import 'server-only'` — сборка падает при затаскивании в client-компонент.
Обёртки (перенос логики Worker'ов через серверный fetch): `selectOrders`,
`patchOrder`, `selectPerfumes`, `upsertPerfume`, `deletePerfume`, `uploadImage`,
`deleteImages`.

### Layout

Отдельный layout `/admin` (sidebar: Дашборд / Заказы / Каталог / Выход), **без**
Header/Footer/BottomNav/корзины публичного сайта. Палитра HARUNGI (ink/cream/gold)
сохраняется.

## Секция 3 — Раздел «Заказы»

**Источник данных.** `orders` + `order_items` через серверный API (RLS на
`orders` закрыт для anon → только сервер). Сортировка `created_at DESC`.

**Список (`/admin/orders`).** Строки: №заказа, дата, имя, контакт, сумма, тип
(single/cart/consultation), бейдж статуса (цвет по статусу). Позиции —
**инлайн-аккордеон** (бренд — название · объём · ×кол-во · цена).

**Фильтр и поиск.** Табы по статусу (Все / Новые / Принят / Отправлен /
Выполнен / Отмена). Поиск по имени / контакту / №заказа. Фильтрация в query к
Supabase (`status=eq.`, `order_number=eq.`, `customer_name=ilike.`), не на клиенте.

**Смена статуса.** Кнопки/дропдаун (new/accepted/shipped/done/canceled) →
`PATCH /api/admin/orders/[id]` → обновляет `status`. UI оптимистичный.

**Примечание.** Поле `note` (уже в `orders`) — текстовое поле в деталях, тем же
`PATCH`.

**Оговорка про чат-зеркало (принята для MVP).** Статус можно менять и кнопками в
Telegram-чате (Worker редактирует сообщение). Смена статуса **с сайта** не
обновит старое сообщение в чате — пути независимы. Supabase = источник правды;
чат покажет неактуальную подпись на старом сообщении. Синхронизация статуса
обратно в чат — **вне MVP** (потребует вызова Worker'а из админки).

## Секция 4 — Раздел «Каталог» (полный CRUD + фото)

**Список (`/admin/catalog`).** Превью фото, бренд — название, цены, бейджи флагов
(в наличии / featured / новинка / хит), «Править» / «Удалить». Поиск по
бренду/названию. Кнопка «➕ Добавить».

**Форма товара** (общий компонент для `new` и `[id]`) — все поля таблицы
`perfumes`:
- Текст: название\*, бренд\*, описание, ноты (верх/серед/база, CSV).
- Числа: цены 5/10/15/20мл, цена оригинала, объём оригинала.
- Селекты (single, из `ENUMS`): пол, тип аромата, формат.
- Мультиселект-чипы: сезон, повод (пусто = авто-вывод на сайте — логика
  `enrichPerfume`).
- Тумблеры: `inStock`, `featured`, `newArrival`, `bestseller`.
- Фото: галерея текущих + загрузка новых + удаление.

**Создание.** `id` = `slugify(бренд+название)` + `makeUniqueId` (коллизии по
существующим id) — копия логики бота. POST → `upsertPerfume`.

**Правка.** Форма предзаполнена; PATCH меняет поля. При смене бренда/названия
`id` **не трогаем** (стабильный ключ, на него ссылается `order_items.perfume_id`).

**Фото.** Загрузка в Storage-бакет `perfume-images` (service_role), URL
дописывается в CSV-колонку `images`. Формат `images` (CSV URL) не меняется —
сайт читает как раньше.

**Удаление.** Подтверждение → `DELETE` товара + best-effort удаление файлов
(префикс по id). `order_items.perfume_id` имеет `on delete set null` — старые
заказы не ломаются (снимок названия/бренда/объёма/цены сохранён в `order_items`).

**Ревалидация.** После создания/правки/удаления — `revalidatePath('/catalog')`
(и затронутых страниц), чтобы изменения были на сайте сразу, не дожидаясь
ISR `revalidate=60`.

**Технический долг (явно).** `slugify`, `makeUniqueId`, `validateField`,
`draftToPerfumeRow`, `ENUMS`/`MULTI_ENUMS` — **копируются** из
`workers/admin-bot.js` в `src/lib/admin/`. Бот сохраняет свою копию. При
расхождении — известный долг; **обе копии менять синхронно**.

## Секция 5 — Ошибки, безопасность, тестирование

**Обработка ошибок.**
- Route Handlers возвращают `{ ok, error }` + HTTP-код (400 валидация,
  401 неавторизован, 500 сбой Supabase). Формы показывают ошибку инлайн
  (`role="alert"`), страница не падает.
- Сбой Supabase при записи → понятное сообщение, данные формы не теряются.
- Загрузка фото: ошибка одного файла не валит остальные; показываем, что прошло.

**Безопасность (сводка).**
- `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` — server-only.
- Серверный Supabase-клиент — с `import 'server-only'`.
- Middleware закрывает `/admin/*` и `/api/admin/*`; cookie
  httpOnly+Secure+SameSite=Lax, подписана HMAC.
- Логин-эндпоинт вне защиты, сравнение пароля константное по времени.

**Тестирование.**
- Юнит-тесты (`node --test`) для функций в `src/lib/admin/`: `slugify`,
  `makeUniqueId`, `validateField`, `draftToPerfumeRow`, `signSession`/
  `verifySession` (подпись/проверка cookie).
- Остальное — `npm run build` + ручная проверка в браузере (как принято в репо).

**Вне MVP (YAGNI).** Роли/несколько пользователей; синхронизация статуса в чат;
rate-limit логина; аналитика сверх простых счётчиков; аудит-лог; пагинация
заказов (добавим, если заказов станет много).

## Затрагиваемые/новые файлы

```
src/middleware.ts                         (нов.) защита /admin и /api/admin
src/lib/admin/session.ts                  (нов.) sign/verify cookie-сессии
src/lib/admin/supabase-server.ts          (нов.) service_role клиент + обёртки
src/lib/admin/catalog-logic.ts            (нов.) slugify/validate/draftToRow (копия из бота)
src/lib/admin/catalog-logic.test.mjs      (нов.) юнит-тесты
src/lib/admin/session.test.mjs            (нов.) юнит-тесты
src/app/admin/layout.tsx                  (нов.) layout админки (sidebar)
src/app/admin/login/page.tsx              (нов.)
src/app/admin/page.tsx                    (нов.) дашборд
src/app/admin/orders/page.tsx             (нов.)
src/app/admin/catalog/page.tsx            (нов.)
src/app/admin/catalog/new/page.tsx        (нов.)
src/app/admin/catalog/[id]/page.tsx       (нов.)
src/components/admin/*                     (нов.) формы, списки, фильтры
src/app/api/admin/login/route.ts          (нов.)
src/app/api/admin/logout/route.ts         (нов.)
src/app/api/admin/orders/route.ts         (нов.)
src/app/api/admin/orders/[id]/route.ts    (нов.)
src/app/api/admin/catalog/route.ts        (нов.)
src/app/api/admin/catalog/[id]/route.ts   (нов.)
src/app/api/admin/catalog/[id]/photo/route.ts (нов.)
```

Существующие файлы публичного сайта и Worker'ов — не меняются.
```
