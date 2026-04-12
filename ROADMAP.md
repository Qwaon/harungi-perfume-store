# HARUNGI — Roadmap

> Цель: стабильный канал продаж через сайт — красивая витрина, понятный каталог, заявки в Telegram без лишних шагов.  
> Telegram-бот остаётся основным, всё работает через безопасный webhook без bot token в клиенте.

---

## Архитектурные принципы (не менять без причины)

- Static export (`output: 'export'`) — нет SSR, нет server routes, деплой на GitHub Pages
- Telegram — единственный канал приёма заявок, бот обрабатывается вручную
- Bot token — только в Cloudflare Worker, никогда в клиентском коде
- Данные каталога — `src/data/perfumes.json` как источник, `src/data/utils.ts` для обогащения, sync через `npm run sync-catalog`
- Шрифты — локальные, без зависимости от Google Fonts при сборке
- Аналитика — `trackEvent()` в `src/lib/analytics.ts`, провайдер подключается одной строкой

---

## Что осталось

### P0 — Безопасность (срочно, ручные действия)

- [ ] **Поднять Cloudflare Worker webhook** с rate limiting по IP (см. `docs/telegram-setup.md`)

### P1 — Доработки

- [ ] Подключить провайдера аналитики (Umami — self-hosted, бесплатно(в долгий ящик))

### P2 — Продукт и рост



- [ ] Проверить и подтвердить production-deploy на GitHub Pages
- [ ] OG-изображения для ключевых страниц(картинки, которые автоматически подставляются при шаринге ссылки в соцсетях и мессенджерах.)

### P3 — Операционка

- [ ] Учёт лидов — таблица Google Sheets или CRM-lite
- [ ] Настроить fast replies в Telegram по шаблонам из `docs/telegram-message-template.md`
- [ ] Переезд с GitHub Pages на Cloudflare Pages (бесплатно + кастомные headers + CSP)
