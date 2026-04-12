# Airtable — добавление и управление каталогом

Airtable — это таблица в браузере. Добавляешь аромат там → запускаешь одну команду → сайт обновлён.

---

## 1. Создать Personal Access Token

1. Открой: https://airtable.com/create/tokens
2. Нажми **Create token**
3. Название: `harungi-sync`
4. Scope: `data.records:read`
5. Access: выбери свою базу (или All bases)
6. Нажми **Create token** — скопируй токен сразу (больше не покажет)

---

## 2. Создать базу и импортировать шаблон

1. Открой https://airtable.com и создай новую базу — назови `HARUNGI`
2. Нажми **Add or import** → **CSV file**
3. Загрузи файл [`docs/airtable-catalog-template.csv`](./airtable-catalog-template.csv) из этого проекта
4. Airtable создаст таблицу со всеми нужными полями и 4 примерами — удали лишние строки и заполняй своё
5. Переименуй таблицу в `Catalog` (если назвалась иначе)

> Шаблон уже содержит 4 реальных аромата из каталога и одну строку-подсказку с подписями.

---

### Структура полей (справочно)

| Поле | Тип | Описание |
|---|---|---|
| `id` | Single line text | Slug для URL: `baccarat-rouge-540` |
| `name` | Single line text | Название: `Baccarat Rouge 540` |
| `brand` | Single line text | Бренд: `Maison Francis Kurkdjian` |
| `description` | Long text | Описание в boutique-стиле |
| `notes_top` | Single line text | Верхние ноты через запятую: `Жасмин, Сафран` |
| `notes_middle` | Single line text | Сердечные ноты через запятую |
| `notes_base` | Single line text | Базовые ноты через запятую |
| `gender` | Single select | `мужской` / `женский` / `унисекс` |
| `scentType` | Single select | `цветочный` / `восточный` / `древесный` / `свежий` / `фужерный` / `шипровый` / `гурманский` |
| `format` | Single select | `оригинал` / `распив` |
| `images` | Long text | URL фото через запятую (Unsplash или свои) |
| `price_2ml` | Number | Цена за 2 мл (пусто = нет такого объёма) |
| `price_5ml` | Number | Цена за 5 мл |
| `price_10ml` | Number | Цена за 10 мл |
| `price_50ml` | Number | Цена за 50 мл (флакон) |
| `price_100ml` | Number | Цена за 100 мл (флакон) |
| `featured` | Checkbox | Показывать на главной |
| `newArrival` | Checkbox | Бейдж «Новинка» |
| `bestseller` | Checkbox | Бейдж «Хит» |

> Поля цены: заполни только те объёмы, которые реально доступны. Пустое поле = объём недоступен.

---

## 3. Найти Base ID

В URL открытой таблицы: `https://airtable.com/appXXXXXXXXXXXXXX/tblYYYY...`  
`appXXXXXXXXXXXXXX` — это и есть Base ID.

---

## 4. Прописать переменные в .env.local

```bash
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX   # Personal Access Token из шага 1
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX   # Base ID из шага 3
AIRTABLE_TABLE_NAME=Catalog           # Название таблицы (оставь так)
```

---

## 5. Синхронизировать каталог

```bash
npm run sync-catalog
```

Скрипт загрузит все записи из Airtable и перезапишет `src/data/perfumes.json`.  
В терминале увидишь: `💾 Записано в src/data/perfumes.json (27 позиций)`

---

## 6. Задеплоить изменения

```bash
git add src/data/perfumes.json
git commit -m "chore: sync catalog"
git push
```

GitHub Actions соберёт сайт и задеплоит автоматически (~2 мин).

---

## Как добавить новый аромат

1. Открой Airtable → таблица `Catalog`
2. Добавь новую строку, заполни поля
3. Убедись, что `id` — уникальный slug (только латиница, цифры, дефисы)
4. Запусти `npm run sync-catalog` в терминале
5. Сделай git commit + push

---

## Как изменить цену или описание

1. Открой Airtable, найди запись, измени нужное поле
2. `npm run sync-catalog` → git commit + push

---

## Как снять с продажи (без удаления)

- Убери все цены (`price_2ml`, `price_5ml` и т.д.) — аромат останется в каталоге, но без объёмов
- Или просто удали строку — после синхронизации пропадёт с сайта

---

## Частые ошибки

**`❌ Не найдены AIRTABLE_API_KEY или AIRTABLE_BASE_ID`**  
→ Проверь `.env.local` — файл должен быть в корне проекта, не в `/src`

**`❌ Ошибка Airtable API 401`**  
→ Токен неверный или истёк. Создай новый на https://airtable.com/create/tokens

**`❌ Ошибка Airtable API 404`**  
→ Base ID неверный или нет доступа к этой базе у данного токена
