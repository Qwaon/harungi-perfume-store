export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin),
      });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405, allowedOrigin);
    }

    try {
      const payload = await request.json();
      const validationError = validatePayload(payload);

      if (validationError) {
        return json({ ok: false, error: validationError }, 400, allowedOrigin);
      }

      const text = formatTelegramMessage(payload);
      const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
        }),
      });

      if (!telegramResponse.ok) {
        const errorText = await telegramResponse.text();
        return json({ ok: false, error: errorText }, 502, allowedOrigin);
      }

      return json({ ok: true }, 200, allowedOrigin);
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500, allowedOrigin);
    }
  },
};

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid payload';

  const required = ['name', 'contact', 'perfumeName', 'brand', 'volume', 'price', 'source', 'pageUrl', 'timestamp'];
  for (const key of required) {
    if (!payload[key]) return `Missing field: ${key}`;
  }

  if (String(payload.name).trim().length < 2) return 'Name is too short';
  if (String(payload.contact).trim().length < 4) return 'Contact is too short';

  return null;
}

function formatTelegramMessage(payload) {
  return [
    payload.messageType === 'consultation' ? 'Новая консультация' : 'Новый заказ',
    '',
    `Аромат: ${payload.brand} — ${payload.perfumeName}`,
    `Объём: ${payload.volume}`,
    `Цена: ${Number(payload.price).toLocaleString('ru-RU')} ₽`,
    '',
    `Имя: ${payload.name}`,
    `Контакт: ${payload.contact}`,
    `Источник: ${payload.source}`,
    `Страница: ${payload.pageUrl}`,
    `Время: ${payload.timestamp}`,
  ].join('\n');
}

function json(body, status, allowedOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(allowedOrigin),
    },
  });
}

function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
