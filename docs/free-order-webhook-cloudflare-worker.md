# Free order webhook via Cloudflare Worker

This project is static (`output: 'export'`), so it cannot safely send Telegram Bot API requests directly from the browser.

The cheapest practical option is Cloudflare Workers Free plan:
- Workers Free plan exists by default for Cloudflare users
- It does not require renting a server
- It can accept POST requests from the website and forward them to Telegram with the bot token stored server-side

Official references:
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Google Apps Script web apps: https://developers.google.com/apps-script/guides/web
- Make free plan: https://www.make.com/en/pricing

## 1. Add environment variable to the site

In `.env.local`:

```bash
NEXT_PUBLIC_ORDER_WEBHOOK_URL=https://your-worker.your-subdomain.workers.dev
```

## 2. Create a Cloudflare Worker

Use the template from [workers/order-webhook.js](/Users/a1/Desktop/проекты/perfume-store/workers/order-webhook.js).

Then set secrets in Cloudflare:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

## 3. Deploy

```bash
npx wrangler deploy
```

## 4. What the frontend sends

The site now sends:
- `name`
- `contact`
- `perfumeId`
- `perfumeName`
- `brand`
- `volume`
- `price`
- `source`
- `pageUrl`
- `pagePath`
- `timestamp`
- `messageType`

If webhook is missing or returns error, the site opens direct Telegram fallback.

## Notes

- This removes the Telegram bot token from the client bundle.
- Client-side honeypot and basic cooldown are already implemented.
- Real rate limiting should still live in the webhook.
