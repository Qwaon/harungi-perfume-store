# Рантайм-каталог из Airtable (ISR) — дизайн

**Дата:** 2026-06-07
**Статус:** утверждён к реализации
**Подход:** Вариант A — серверный data-layer + ISR, фолбэк на встроенный JSON

## Цель

Каталог читается из Airtable **во время работы сайта** (а не только при сборке), чтобы
изменения товаров появлялись без ручного `npm run sync-catalog`, коммита и пересборки.
Свежесть — ISR-ревалидация ~60 сек. При недоступности Airtable — фолбэк на встроенный
`perfumes.json`, сайт не падает.

## Решения (зафиксированы с пользователем)

- **Свежесть:** ISR, `revalidate = 60` сек.
- **При сбое Airtable:** фолбэк на встроенный `src/data/perfumes.json`.
- **Новые товары:** страницы `/product/[id]` и `/catalog/[brand]` генерируются on-demand
  (`dynamicParams = true`) — без пересборки.
- **Производные поля** (`occasion`, `season`, `intensity`, `sourceType`, `inStock`): сохраняем
  `enrichPerfume()` — применяется и к данным из Airtable.
- **Архитектура:** fetch только на сервере; ключ Airtable не в клиентском бандле.

## Ограничения / последствия (приняты осознанно)

- Зависимость от доступности Airtable и его rate-limit (5 req/sec на базу) — снижается ISR-кэшем.
- Сайт теряет часть «чисто статичности»: страницы кэшируются ISR, а не пререндерятся намертво.
- Первый запрос к новой странице (новый товар/бренд) — чуть медленнее (генерация on-demand).

## Архитектура

### Новые/изменённые модули данных

```
src/data/
├── transform.ts   ← НОВЫЙ: трансформация Airtable-записи → BasePerfume (DRY: общий код
│                     для рантайма и для scripts/sync-catalog.mjs)
├── catalog.ts     ← НОВЫЙ: async getPerfumes()/getBrands()/getBrandEntries()/
│                     getPerfumesByBrandSlug() с fetch+ISR+enrich+фолбэк
├── perfumes.ts    ← ОСТАЁТСЯ как синхронный фолбэк-источник (читается catalog.ts в catch);
│                     страницы больше НЕ импортируют `perfumes` напрямую (кроме client account/*)
├── perfumes.json  ← фолбэк-данные (обновляются sync-catalog как бэкап)
└── utils.ts       ← enrichPerfume/slugifyBrand/buildBrandEntries (без изменений)
```

### `src/data/transform.ts`

Выносим из `scripts/sync-catalog.mjs` функцию трансформации записи Airtable в объект
`BasePerfume` (поля до обогащения). Используется и скриптом, и рантаймом. Логика идентична
текущей в `sync-catalog.mjs` (`transformRecord`): парсинг notes, prices, availableVolumes,
images, booleans.

Подпись:

```ts
export interface AirtableRecord { id: string; fields: Record<string, unknown>; }
export function transformRecord(record: AirtableRecord): BasePerfume | null;
// возвращает null, если нет id/name (как текущий .filter(p => p.id && p.name))
```

`BasePerfume` = `Omit<Perfume, 'occasion'|'season'|'intensity'|'sourceType'|'inStock'> &
{ inStock?: boolean }` — тот же тип, что в `utils.ts`. Экспортируем его из `utils.ts` для
переиспользования.

### `src/data/catalog.ts`

```ts
export async function getPerfumes(): Promise<Perfume[]>
export async function getBrands(): Promise<string[]>
export async function getBrandEntries(): Promise<{ name: string; slug: string }[]>
export async function getPerfumesByBrandSlug(slug: string): Promise<Perfume[]>
```

`getPerfumes()`:
1. Если нет `AIRTABLE_API_KEY`/`AIRTABLE_BASE_ID` → сразу фолбэк (см. ниже).
2. fetch всех записей Airtable с пагинацией. Каждый запрос:
   `fetch(url, { headers: { Authorization: Bearer ... }, next: { revalidate: 60 } })`.
3. `records.map(transformRecord).filter(Boolean)` → `.map(enrichPerfume)` → `.filter(inStock)`.
4. **catch / не-200 / пустой результат при ошибке** → фолбэк:
   `(perfumesJson as BasePerfume[]).map(enrichPerfume).filter(inStock)`
   (тот же расчёт, что сейчас в `perfumes.ts`).

`getBrands`/`getBrandEntries`/`getPerfumesByBrandSlug` — async-обёртки над `getPerfumes()`
(переиспользуют `buildBrandEntries`, `getPerfumesByBrandSlug` util из `utils.ts`).

Конфиг (env, только сервер): `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`
(default `Catalog`). **Без `NEXT_PUBLIC_`**.

## Страницы (App Router)

Все серверные страницы, читающие каталог, становятся `async` и зовут `catalog.ts`.

| Файл | Изменение |
|---|---|
| `app/catalog/page.tsx` | `const perfumes = await getPerfumes()`; `<CatalogClient perfumes=… brands=… genders=… scentTypes=… formats=… />`; `export const revalidate = 60` |
| `app/catalog/[brand]/page.tsx` | `generateStaticParams` → `await getBrandEntries()`; страница → `await getPerfumesByBrandSlug(slug)`; `export const dynamicParams = true`; `revalidate = 60` |
| `app/product/[id]/page.tsx` | `generateStaticParams` → `(await getPerfumes()).map(id)`; страница → найти в `await getPerfumes()`, иначе `notFound()`; `dynamicParams = true`; `revalidate = 60` |
| `app/page.tsx` (главная) | заменить импорт `perfumes` на `await getPerfumes()` там, где он используется (FeaturedPerfumes и т.п. получают данные пропсами) |
| `app/guides/mens-everyday/page.tsx`, `app/guides/summer-fragrances/page.tsx` | заменить `perfumes` на `await getPerfumes()` |

### `CatalogClient` (client)

Сейчас импортирует `{ perfumes }`, `{ brands, genders, scentTypes, formats }` из
`@/data/perfumes`. Меняем: принимает их **пропсами** от серверной `catalog/page.tsx`.
Внутренняя логика фильтрации/поиска не меняется. `genders/scentTypes/formats` —
статические списки, передаём из серверной страницы (импорт констант там разрешён, т.к. это
не данные Airtable; либо оставить их экспортом-константой и импортировать на сервере).

## Клиентский `account/*` (Telegram)

`FavoritesGrid` и `OrderHistory` — клиентские, резолвят товары по id. Рантайм-свежесть для них
**не критична** (избранное/история ссылаются на уже виденные товары). Решение: продолжают
использовать **синхронный встроенный список** из `@/data/perfumes` (фолбэк-JSON). Это
сознательный компромисс ради простоты — не тащим async-фетч в клиентский Telegram-UI.
`OrderHistory` уже имеет фолбэк «Аромат» для неизвестных id — этого достаточно.

## Безопасность ключей

- `AIRTABLE_API_KEY` используется только в `catalog.ts` (server-only, без `NEXT_PUBLIC_`),
  не попадает в клиентский бандл. На Vercel добавить в Environment Variables (Production + Preview).
- ⚠️ **Обязательная правка вне scope фичи:** `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` в `.env.local`
  имеет префикс `NEXT_PUBLIC_` → встраивается в клиентский бандл (утечка токена бота). Токен в
  коде не используется. Действие: удалить переменную (или переименовать без `NEXT_PUBLIC_`,
  если когда-то понадобится серверу). Зафиксировать в плане отдельным шагом-предупреждением.

## Совместимость

- `npm run sync-catalog` остаётся рабочим: переиспользует `transform.ts`, обновляет
  `perfumes.json` как актуальный фолбэк-бэкап. Полезно периодически коммитить свежий JSON.
- Типы `Perfume`/`BasePerfume` не меняются — UI-компоненты не трогаем (кроме переноса источника
  данных в пропсы у `CatalogClient`).

## Тестирование (тестов в проекте нет; проверка — сборка + ручная)

- `npm run build` — async-страницы типизируются, сборка проходит.
- Локально с реальными ключами Airtable: `/catalog`, `/product/[id]`, `/catalog/[brand]`,
  главная рендерятся из Airtable.
- **Фолбэк:** временно испортить `AIRTABLE_BASE_ID` → сайт отдаёт встроенный JSON, не падает,
  ошибок рендера нет.
- **Новый товар:** добавить запись в Airtable → её страница `/product/[newId]` открывается
  on-demand (200, не 404).
- **ISR на проде:** изменить поле товара в Airtable → через ≤60 сек изменение видно на сайте.

## Вне scope (YAGNI / на будущее)

- Кэш короче 60 сек / вебхук-инвалидация из Airtable (on-demand revalidation).
- Перенос `account/*` на рантайм-данные.
- Админка/панель заказов, изменение схемы Airtable.
