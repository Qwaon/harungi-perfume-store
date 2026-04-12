# HARUNGI — Perfume Store

Нишевая и селективная парфюмерия. Оригиналы и распивы от 2 мл. Ставрополь + доставка по России.

## Стек

- **Next.js 14.2.35** (App Router, static export)
- **TypeScript**
- **Tailwind CSS** — кастомная палитра (ink, cream, gold)
- **Framer Motion** — все анимации
- **Static font stack** — без зависимости сборки от Google Fonts

## Запуск

```bash
npm run dev           # локальный сервер http://localhost:3000
npm run build         # production сборка (статический экспорт)
npm run sync-catalog  # синхронизация каталога из Airtable → src/data/perfumes.json
```

## Структура

```
src/
├── app/
│   ├── layout.tsx              # Root layout: Header + Footer, viewport, metadata
│   ├── globals.css             # Tailwind + кастомные классы (.btn-primary, .section-title и др.)
│   ├── page.tsx                # Главная: Hero, FeaturedPerfumes, DecantsBanner, TrustSection
│   ├── catalog/
│   │   ├── page.tsx            # Каталог с фильтрами
│   │   └── [brand]/page.tsx    # Брендовые страницы (SSG)
│   ├── product/[id]/page.tsx   # Страница товара (SSG, async params)
│   ├── about/page.tsx
│   ├── faq/page.tsx
│   ├── how-it-works/page.tsx
│   └── guides/
│       ├── summer-fragrances/
│       └── mens-everyday/
├── components/
│   ├── Header.tsx              # Фиксированный хедер + мобильное меню
│   ├── Hero.tsx
│   ├── FeaturedPerfumes.tsx    # Сетка из 4 избранных товаров
│   ├── ProductCard.tsx         # Карточка товара с избранным и hover-эффектами
│   ├── ProductPageClient.tsx   # Страница товара: галерея, ноты, выбор объёма, заявка
│   ├── CatalogClient.tsx       # Каталог: поиск, сортировка, фильтры (sidebar + mobile drawer)
│   ├── ImageGallery.tsx        # Галерея: swipe на мобиле, стрелки, thumbnails (next/image)
│   ├── VolumeSelector.tsx      # Выбор объёма: распивы (2/5/10 мл) + оригинал (50/100 мл)
│   ├── OrderModal.tsx          # Bottom sheet на мобиле / диалог на desktop
│   ├── DecantsBanner.tsx
│   ├── TrustSection.tsx
│   ├── SocialProofSection.tsx
│   ├── GuaranteesSection.tsx
│   ├── FinalCTA.tsx
│   ├── FAQItem.tsx             # 'use client' accordion item
│   └── Footer.tsx
├── data/
│   ├── perfumes.json           # Источник данных каталога (обновляется через sync-catalog)
│   ├── perfumes.ts             # Экспорт: perfumes[], brands[], brandEntries, getPerfumesByBrandSlug()
│   └── utils.ts                # enrichPerfume(), slugifyBrand(), buildBrandEntries()
├── lib/
│   ├── constants.ts            # TELEGRAM_URL, VOLUME_LABELS, VOLUME_HINTS
│   └── analytics.ts            # trackEvent() — готово к подключению провайдера
├── hooks/
│   └── useFavorites.ts         # Избранное через localStorage
└── types/
    └── index.ts                # Perfume, Volume, FilterState, OrderPayload
```

## Данные о товарах

**Источник:** `src/data/perfumes.json` — обновляется командой `npm run sync-catalog` из Airtable.  
**Не редактировать вручную** — изменения перезапишутся при следующей синхронизации.

Структура одного товара в JSON:

```ts
{
  id: string,           // slug для URL /product/[id] и /catalog/[brand]
  name: string,
  brand: string,
  description: string,
  notes: { top: string[], middle: string[], base: string[] },
  gender: 'мужской' | 'женский' | 'унисекс',
  scentType: 'цветочный' | 'восточный' | 'древесный' | 'свежий' | 'фужерный' | 'шипровый' | 'гурманский',
  format: 'оригинал' | 'распив',
  images: string[],     // URL-ы через запятую (Unsplash или свои)
  prices: { '2ml'?: number, '5ml'?: number, '10ml'?: number, '50ml'?: number, '100ml'?: number },
  availableVolumes: Volume[],
  featured: boolean,
  newArrival: boolean,
  bestseller: boolean,
}
```

Поля `occasion`, `season`, `intensity`, `inStock`, `sourceType` — **не хранятся в JSON**, автоматически выводятся через `enrichPerfume()` в `utils.ts`.

## Цветовая палитра (Tailwind)

```
ink-900   #0A0A0A  — основной текст, кнопки
ink-700   #2D2D2D  — вторичный тёмный
ink-500   #555555  — приглушённый текст
ink-300   #999999  — лейблы, метки
cream-50  #FFFFFF
cream-100 #F5F5F5  — фон страницы
cream-200 #E8E8E8  — рамки, фон карточек
cream-300 #D0D0D0
gold-500  #555555  — акцент (лейблы брендов)
```

## CSS-утилиты (globals.css)

```css
.btn-primary    /* тёмная кнопка с hover lift */
.btn-outline    /* кнопка с рамкой */
.section-title  /* text-3xl sm:text-4xl md:text-5xl, Cormorant */
.label          /* мелкий uppercase трекинговый текст */
.input-base     /* инпут с фокус-стилями */
```

## Мобильная адаптация

- `viewport-fit=cover` — поддержка iPhone notch
- `safe-area-inset-bottom` в Footer, OrderModal, фильтрах каталога
- OrderModal — bottom sheet снизу на мобиле, диалог на sm+
- ImageGallery — swipe (touchstart/touchend), кнопки 44×44px, thumbnails через `next/image`
- Все контейнеры: `px-4 sm:px-6`

## Деплой (GitHub Pages)

Репозиторий: `https://github.com/Qwaon/harungi-perfume-store`  
Сайт: `https://qwaon.github.io/harungi-perfume-store/`

`next.config.mjs`:
```js
output: 'export'
basePath: '/harungi-perfume-store'
trailingSlash: true
images: { unoptimized: true }
```

GitHub Actions в `.github/workflows/deploy.yml` собирает и деплоит автоматически при push в `main`.

## Заявки и Telegram

Схема:
1. Пользователь заполняет `OrderModal`
2. Сайт отправляет payload на `NEXT_PUBLIC_ORDER_WEBHOOK_URL` (Cloudflare Worker)
3. Worker шлёт сообщение в Telegram с bot token на своей стороне
4. Если webhook недоступен — открывается fallback `t.me/alsharkisia?text=...`

Переменные окружения (`.env.local`):
```bash
NEXT_PUBLIC_ORDER_WEBHOOK_URL=   # URL Cloudflare Worker
AIRTABLE_API_KEY=                # Personal Access Token (только для sync-catalog)
AIRTABLE_BASE_ID=                # appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Catalog
```

Инструкции по подключению:
- Telegram + Cloudflare Worker: `docs/telegram-setup.md`
- Airtable CMS: `docs/airtable-setup.md`
- Шаблон таблицы для импорта: `docs/airtable-catalog-template.csv`

## Аналитика

`src/lib/analytics.ts` — `trackEvent(name, props?)` вызывается в коде при ключевых событиях:
`product_view`, `volume_select`, `order_open`, `order_submit`, `order_fallback`, `cta_click`

Сейчас пишет в `console.debug` в dev-режиме. Для подключения провайдера (Umami, Plausible, Яндекс Метрика) — добавить вызов в теле функции.

## Контакты

Telegram: `@alsharkisia` (`https://t.me/alsharkisia`)
