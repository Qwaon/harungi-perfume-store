# Admin UI Redesign — Design Spec

**Дата:** 2026-06-12
**Статус:** approved by user

## Цель

Текущий `/admin` выглядит как "вялая старая CRM": плоские бежевые карточки, эмодзи вместо иконок, минимум визуальной иерархии. Нужен полный визуальный редизайн интерфейса (Дашборд, Каталог, Заказы, навигация, логин) с сохранением палитры HARUNGI (cream/ink/gold) и карточного подхода (без табличного вида — намеренное решение из прошлой сессии).

## Библиотека иконок

`@heroicons/react` (v2) — новая зависимость. Использовать `/24/outline` для большинства UI-элементов и `/24/solid` или `/20/solid` для статус-бейджей/активных состояний навигации.

## 1. Навигация — `AdminNav` → `AdminSidebar`

- Десктоп (`md:` и выше): постоянный левый сайдбар, ширина `w-56`, фон `bg-cream-50`, правая граница `border-r border-cream-200`.
  - Бренд "HARUNGI" сверху (font-display, tracking).
  - Пункты меню: Дашборд (`HomeIcon`), Заказы (`ShoppingBagIcon`), Каталог (`Squares2X2Icon`).
  - Активный пункт: `bg-gold-500/10 text-ink-900` + левая акцентная полоска `border-l-2 border-gold-500` (или `bg-gold-500` блок 2px слева).
  - Неактивный: `text-ink-500 hover:text-ink-900 hover:bg-cream-100`.
  - Кнопка "Выход" (`ArrowRightOnRectangleIcon`) внизу сайдбара, прижата к низу через `mt-auto`.
- Мобильный (`< md`): верхний бар (как сейчас, `h-14`) с логотипом и кнопкой-гамбургером (`Bars3Icon`/`XMarkIcon`), раскрывающей те же пункты в выпадающем списке под баром (не drawer — проще, без z-index конфликтов с остальным сайтом, т.к. `/admin` уже скрывает сайтовый chrome).
- `AdminLayout` (`src/app/admin/layout.tsx`): меняется на `flex` контейнер — сайдбар + `<main>` с `flex-1`. На мобильном `flex-col`.
- Иконки в навигации — `outline` 24px, активный пункт — иконка тем же стилем но с `text-gold-500`.

## 2. Дашборд (`src/app/admin/page.tsx`)

### Stat cards
- Сетка `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (как сейчас).
- Каждая карточка: круглый бейдж `w-10 h-10 rounded-full` с фоном `bg-gold-500/10` и иконкой `text-gold-500` (24px outline) вместо эмодзи.
- Маппинг иконок:
  - total → `ClipboardDocumentListIcon`
  - new → `SparklesIcon`
  - accepted → `CheckCircleIcon`
  - shipped → `TruckIcon`
  - done → `CheckBadgeIcon`
  - canceled → `XCircleIcon`
  - "Товаров" → `Squares2X2Icon`
- Число — крупный `font-display`, как сейчас (gold для total, ink-900 для остальных).

### "Требует внимания"
- Карточки-алерты с иконкой в цветном кружке:
  - `no-photo` → `PhotoIcon`, амбер-тон (`bg-amber-500/10 text-amber-600`)
  - `no-price` → `BanknotesIcon`, амбер-тон
  - `out-of-stock` → `NoSymbolIcon`, красный тон (`bg-red-500/10 text-red-600`)
- Карточка — кликабельная ссылка (как сейчас), hover поднимает фон до `bg-cream-200`.
- Пустое состояние "Проблем не найдено 🎉" → заменить на карточку с `CheckCircleIcon` (зелёный, `text-green-600`) + текст "Проблем не найдено".

### "Топ продаж"
- Заголовки блоков получают иконку: Топ товаров → `TrophyIcon`, Топ брендов → `ChartBarIcon` (gold-500, 20px, рядом с `label`).
- Ранговые строки 1-3 получают небольшой круглый бейдж с номером, подсвеченный (`bg-gold-500 text-cream-50` для #1, `bg-gold-400/60` для #2-3, обычный текст для остальных).
- Пустое состояние "Пока нет данных" — оставить текстом, без иконки (не критично).

## 3. Каталог (`CatalogListClient.tsx`)

- Поиск: `MagnifyingGlassIcon` (20px, `text-ink-300`) внутри инпута слева (`relative` + `absolute` позиционирование иконки, `pl-9` на инпуте).
- Фильтры: обернуть селекты в строку с `FunnelIcon` индикатором слева от группы фильтров (один раз, не на каждый селект) — лейбл "Фильтры" с иконкой.
- Карточка товара:
  - Плейсхолдер без фото → `PhotoIcon` (32px, `text-ink-300`) по центру серого квадрата вместо пустого `div`.
  - Бейдж наличия: pill `text-xs px-2 py-0.5 rounded-full` — "в наличии" зелёный (`bg-green-500/10 text-green-700`), "нет в наличии" красный (`bg-red-500/10 text-red-700`).
  - Кнопки "Править"/"Удалить" → иконки (`PencilSquareIcon`, `TrashIcon`, 18px) с `aria-label`, hover `text-ink-900`/`text-red-600` соответственно.
- Группа-заголовок бренда: добавить `border-b border-cream-200` под sticky-заголовком для визуального разделения групп.
- Панель массового выбора ("Выбрано: N · Изменить цены"): когда `selected.size > 0`, делает sticky-бар снизу экрана (`fixed bottom-0 md:static`) с фоном `bg-ink-900 text-cream-50`, иконка `CurrencyDollarIcon` на кнопке "Изменить цены".
  - На мобильном — `fixed bottom-0 left-0 right-0 z-40 px-4 py-3` (выше `BottomNav`, но `/admin` его не показывает — проверить, что конфликтов нет).
  - На десктопе — обычный inline-бар как сейчас, но со стилизацией (фон `bg-cream-200 rounded-xl px-4 py-2`).

## 4. Заказы (`OrdersClient.tsx`)

- Статус-табы: pill-кнопки получают иконку слева (16px) — те же иконки, что на дашборде (new=`SparklesIcon`, accepted=`CheckCircleIcon`, shipped=`TruckIcon`, done=`CheckBadgeIcon`, canceled=`XCircleIcon`), "Все" → `Squares2X2Icon`.
- Карточка заказа (свёрнутая):
  - Статус справа от суммы или под номером — цветной бейдж pill (тот же подход, что и наличие в каталоге): new=серый/gold, accepted=зелёный, shipped=синий (`bg-blue-500/10 text-blue-700`), done=зелёный тёмный, canceled=красный.
  - Шеврон разворачивания (`ChevronDownIcon`, поворот на 180° при `open` через `transition-transform`).
- Развёрнутая часть:
  - Контакт: иконка перед ссылкой — `ChatBubbleLeftRightIcon` (Telegram) или `PhoneIcon` (телефон) в зависимости от того, что вернул `contactHref` (по паттерну: `tel:` → телефон, `https://t.me/` → telegram).
  - Кнопки смены статуса — pill с иконкой + лейблом, активный статус подсвечен заливкой соответствующего цвета (а не только gold).
  - Textarea заметки — добавить иконку `PencilIcon` в label/placeholder зону (опционально, не критично).

## 5. Логин (`src/app/admin/login/page.tsx`)

- Карточка формы: заменить hairline-границу на `shadow-lg shadow-ink-900/5` + `border border-cream-200` для большей "приподнятости".
- Инпут пароля: иконка `LockClosedIcon` слева (`pl-9`), кнопка показать/скрыть пароль (`EyeIcon`/`EyeSlashIcon`) справа — небольшое полезное дополнение.

## Цветовые токены статусов (новые, не в Tailwind config)

Используются как литералы Tailwind-классов (arbitrary/utility), без расширения `tailwind.config.ts` — стандартные цвета Tailwind (`amber`, `red`, `green`, `blue`) уже доступны по умолчанию:

| Статус/состояние | Фон | Текст |
|---|---|---|
| success / в наличии / done | `bg-green-500/10` | `text-green-700` |
| warning / алерты | `bg-amber-500/10` | `text-amber-600` |
| danger / нет в наличии / canceled | `bg-red-500/10` | `text-red-700` |
| info / shipped | `bg-blue-500/10` | `text-blue-700` |
| neutral / new | `bg-ink-900/5` | `text-ink-700` |
| accent / gold | `bg-gold-500/10` | `text-gold-500` |

## Файлы

- Создать/изменить:
  - `package.json` — добавить `@heroicons/react`
  - `src/components/admin/AdminNav.tsx` → переписать в сайдбар (можно переименовать в `AdminSidebar.tsx`, обновить импорт в layout)
  - `src/app/admin/layout.tsx` — flex layout
  - `src/app/admin/page.tsx` — иконки на дашборде
  - `src/components/admin/CatalogListClient.tsx` — иконки, бейджи, sticky-бар выбора
  - `src/components/admin/OrdersClient.tsx` — иконки, статус-бейджи
  - `src/app/admin/login/page.tsx` — иконки в форме
  - `src/components/admin/BulkPriceModal.tsx` — иконка в заголовке/кнопке (минимально)

## Тестирование

- `npm run build` — TS-проверка.
- Существующие тесты `npx tsx --test src/lib/admin/*.test.mjs` не затрагиваются (чисто UI-изменения).
- Live-проверка через Playwright MCP: логин, дашборд, каталог (фильтры, карточка без фото, выбор + bulk-бар), заказы (табы, разворачивание карточки, статус-бейджи), мобильный вид навигации (resize viewport).

## Вне скоупа

- Изменение бизнес-логики/API.
- Полная замена карточного вида на табличный (явно отвергнуто пользователем ранее).
- Тёмная тема.
