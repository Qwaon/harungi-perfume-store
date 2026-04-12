

## 3. Развернуть Cloudflare Worker

### 3.1 Зарегистрироваться на Cloudflare
Бесплатный аккаунт: https://dash.cloudflare.com/sign-up  
Бесплатный план Workers: 100 000 запросов/день — хватит на любой объём.

### 3.2 Установить Wrangler (один раз)
```bash
npm install -g wrangler
wrangler login
```
Откроется браузер — войди в аккаунт Cloudflare.

### 3.3 Создать wrangler.toml в папке workers/
```bash
cd workers
```
Создай файл `wrangler.toml`:
```toml
name = "harungi-order-webhook"
main = "order-webhook.js"
compatibility_date = "2024-01-01"
```

### 3.4 Прописать секреты (бот токен и chat id)
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
# вставь токен бота и нажми Enter

npx wrangler secret put TELEGRAM_CHAT_ID
# вставь свой Chat ID и нажми Enter
```

### 3.5 Прописать разрешённый origin (безопасность)
```bash
npx wrangler secret put ALLOWED_ORIGIN
# вставь: https://qwaon.github.io
```

### 3.6 Задеплоить Worker
```bash
npx wrangler deploy
```
Wrangler выдаст URL вида: `https://harungi-order-webhook.ВАШ-ПОДДОМЕН.workers.dev`

---

## 4. Подключить Worker к сайту

Открой `.env.local` в корне проекта и вставь URL воркера:
```bash
NEXT_PUBLIC_ORDER_WEBHOOK_URL=https://harungi-order-webhook.ВАШ-ПОДДОМЕН.workers.dev
```

Пересобери и задеплой сайт:
```bash
git add .env.local
git commit -m "feat: connect order webhook"
git push
```

---

## 5. Проверить что всё работает

1. Открой сайт → любой товар → нажми «Заказать»
2. Заполни форму → отправь
3. Проверь — пришло ли сообщение в Telegram

Если не пришло — открой Cloudflare Dashboard → Workers → `harungi-order-webhook` → вкладка **Logs** (Real-time Logs) — там увидишь ошибки.

---

## Как работает fallback

Если Worker недоступен или вернул ошибку — сайт автоматически открывает Telegram с предзаполненным текстом (`t.me/alsharkisia?text=...`). Заявки не теряются.

---

## Обновить Worker после изменений

Если изменил `workers/order-webhook.js`:
```bash
cd workers
npx wrangler deploy
```

---

## Изменить бота или chat_id

```bash
cd workers
npx wrangler secret put TELEGRAM_BOT_TOKEN   # введи новый токен
npx wrangler secret put TELEGRAM_CHAT_ID     # введи новый chat_id
```
Переразворачивать Worker не нужно — секреты обновляются сразу.

---

## Формат входящего сообщения

Пример того, что приходит в Telegram при заявке:

```
Новый заказ

Аромат: Maison Francis Kurkdjian — Baccarat Rouge 540
Объём: 5ml
Цена: 1 200 ₽

Имя: Алексей
Контакт: @aleksey_tg
Источник: direct
Страница: https://qwaon.github.io/harungi-perfume-store/product/baccarat-rouge-540/
Время: 2026-04-11T14:23:01.000Z
```

Шаблоны быстрых ответов: [telegram-message-template.md](./telegram-message-template.md)
