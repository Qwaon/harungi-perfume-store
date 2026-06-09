// Статусы заказа и их подписи для кнопок/сообщения.
const STATUS_LABELS = {
  new: 'Новый',
  accepted: '✅ Принят',
  shipped: '📦 Отправлен',
  done: '✔️ Выполнен',
  canceled: '✖️ Отмена',
};

/** Разбор callback_data "s:<id>:<status>". → {id,status} | null. */
export function parseStatusCallback(data) {
  if (typeof data !== 'string' || !data.startsWith('s:')) return null;
  const parts = data.split(':');
  const id = parts[1];
  const status = parts[2];
  if (!id || !STATUS_LABELS[status]) return null;
  return { id, status };
}

/**
 * payload (single/cart/consultation) → { order, items }.
 * order — строка для таблицы orders; items — массив строк order_items (снимок).
 */
export function buildOrderRows(payload) {
  const isCart = Array.isArray(payload.items);
  const tgUserId = payload.tgUserId != null && payload.tgUserId !== ''
    ? Number(payload.tgUserId) : null;

  let items;
  let total;
  let type;

  if (isCart) {
    items = payload.items.map((i) => ({
      perfume_id: i.perfumeId,
      perfume_name: i.perfumeName,
      brand: i.brand,
      volume: i.volumeLabel || i.volume,
      quantity: i.quantity || 1,
      price: Number(i.price),
    }));
    total = Number(payload.total);
    type = 'cart';
  } else {
    items = [{
      perfume_id: payload.perfumeId,
      perfume_name: payload.perfumeName,
      brand: payload.brand,
      volume: payload.volumeLabel || payload.volume,
      quantity: 1,
      price: Number(payload.price),
    }];
    total = Number(payload.price);
    type = payload.type || (payload.messageType === 'consultation' ? 'consultation' : 'single');
  }

  const order = {
    status: 'new',
    customer_name: String(payload.name),
    contact: String(payload.contact),
    total,
    type,
    source: String(payload.source || ''),
    page_url: String(payload.pageUrl || ''),
    tg_user_id: tgUserId,
  };

  return { order, items };
}

const INITDATA_TTL_SEC = 24 * 60 * 60;  // 24ч — защита от реиграния

async function hmacSha256(keyBytes, msgStr) {
  const key = await crypto.subtle.importKey('raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msgStr)));
}

/**
 * Проверка подписи Telegram Web App initData.
 * → { ok:true, userId } при валидной свежей подписи, иначе { ok:false }.
 */
export async function verifyInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { ok: false };

    // data_check_string: все пары кроме hash, key=value, отсортированы, через \n.
    const pairs = [];
    for (const [k, v] of params.entries()) {
      if (k !== 'hash') pairs.push(`${k}=${v}`);
    }
    pairs.sort();
    const dcs = pairs.join('\n');

    const enc = new TextEncoder();
    const secret = await hmacSha256(enc.encode('WebAppData'), botToken);
    const sig = await hmacSha256(secret, dcs);
    const sigHex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (sigHex !== hash) return { ok: false };

    // Свежесть.
    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate)) return { ok: false };
    if (Math.floor(Date.now() / 1000) - authDate > INITDATA_TTL_SEC) return { ok: false };

    const user = JSON.parse(params.get('user') || '{}');
    if (!user.id) return { ok: false };
    return { ok: true, userId: Number(user.id) };
  } catch {
    return { ok: false };
  }
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    // Telegram callback (смена статуса по кнопке).
    if (url.pathname === '/tg' && request.method === 'POST') {
      return handleTelegramCallback(request, env);
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405, allowedOrigin);
    }

    return handleOrder(request, env, allowedOrigin);
  },
};

async function handleOrder(request, env, allowedOrigin) {
  try {
    const payload = await request.json();
    const validationError = validatePayload(payload);

    if (validationError) {
      return json({ ok: false, error: validationError }, 400, allowedOrigin);
    }

    // Создаём запись в Airtable (источник правды по статусу).
    const order = await createAirtableOrder(payload, env);

    const text = formatTelegramMessage(payload, order && order.orderNumber);
    const sendBody = {
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
    };
    // Кнопки статуса добавляются только если запись создана (есть recordId).
    if (order && order.recordId) {
      sendBody.reply_markup = statusKeyboard(order.recordId);
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendBody),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      return json({ ok: false, error: errorText }, 502, allowedOrigin);
    }

    return json({ ok: true, orderNumber: order ? order.orderNumber : null }, 200, allowedOrigin);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500, allowedOrigin);
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid payload';

  const baseRequired = ['name', 'contact', 'source', 'pageUrl', 'timestamp'];
  for (const key of baseRequired) {
    if (!payload[key]) return `Missing field: ${key}`;
  }

  const isCart = Array.isArray(payload.items);
  if (isCart) {
    if (payload.items.length === 0) return 'Empty cart';
    if (payload.total == null) return 'Missing field: total';
  } else {
    for (const key of ['perfumeName', 'brand', 'volume', 'price']) {
      if (!payload[key]) return `Missing field: ${key}`;
    }
  }

  if (String(payload.name).trim().length < 2) return 'Name is too short';
  if (String(payload.contact).trim().length < 4) return 'Contact is too short';

  return null;
}

function formatTelegramMessage(payload, orderNumber) {
  const title = payload.messageType === 'consultation' ? 'Новая консультация' : 'Новый заказ';
  const header = orderNumber ? `${title} №${orderNumber}` : title;
  const lines = [header, ''];

  if (Array.isArray(payload.items)) {
    // Заказ-корзина.
    payload.items.forEach((item) => {
      const qtyPart = item.quantity > 1 ? ` ×${item.quantity}` : '';
      const linePrice = Number(item.price * item.quantity).toLocaleString('ru-RU');
      lines.push(`• ${item.brand} — ${item.perfumeName} ${item.volumeLabel}${qtyPart} — ${linePrice} ₽`);
    });
    lines.push(`Итого: ${Number(payload.total).toLocaleString('ru-RU')} ₽`);
  } else {
    // Одиночный заказ / консультация.
    lines.push(`Аромат: ${payload.brand} — ${payload.perfumeName}`);
    lines.push(`Объём: ${payload.volumeLabel || payload.volume}`);
    lines.push(`Цена: ${Number(payload.price).toLocaleString('ru-RU')} ₽`);
  }

  lines.push(
    '',
    `Имя: ${payload.name}`,
    `Контакт: ${payload.contact}`,
    `Источник: ${payload.source}`,
    `Страница: ${payload.pageUrl}`,
    `Время: ${payload.timestamp}`
  );
  return lines.join('\n');
}

// Создаёт запись заказа в Airtable Orders. Возвращает { recordId, orderNumber }
// или null при любой ошибке/отсутствии ключей (деградация: заказ всё равно уйдёт в чат).
async function createAirtableOrder(payload, env) {
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) return null;
  const table = env.AIRTABLE_ORDERS_TABLE || 'Orders';

  const isCart = Array.isArray(payload.items);
  let itemsText;
  let total;
  let type;

  if (isCart) {
    itemsText = payload.items
      .map((i) => {
        const qty = i.quantity > 1 ? ` ×${i.quantity}` : '';
        return `${i.brand} — ${i.perfumeName} ${i.volumeLabel}${qty} — ${Number(i.price * i.quantity)} ₽`;
      })
      .join('\n');
    total = Number(payload.total);
    type = 'cart';
  } else {
    itemsText = `${payload.brand} — ${payload.perfumeName} ${payload.volumeLabel || payload.volume} — ${Number(payload.price)} ₽`;
    total = Number(payload.price);
    type = payload.type || (payload.messageType === 'consultation' ? 'consultation' : 'single');
  }

  const fields = {
    status: 'new',
    customerName: String(payload.name),
    contact: String(payload.contact),
    items: itemsText,
    total,
    type,
    source: String(payload.source || ''),
    pageUrl: String(payload.pageUrl || ''),
    tgUserId: payload.tgUserId ? String(payload.tgUserId) : '',
  };

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { recordId: data.id, orderNumber: data.fields && data.fields.orderNumber };
  } catch {
    return null;
  }
}

// Inline-клавиатура для смены статуса. callback_data = "s:<recordId>:<status>".
function statusKeyboard(recordId, activeStatus) {
  const btn = (status) => ({
    text: activeStatus === status ? `• ${STATUS_LABELS[status]}` : STATUS_LABELS[status],
    callback_data: `s:${recordId}:${status}`,
  });
  return {
    inline_keyboard: [
      [btn('accepted'), btn('shipped')],
      [btn('done'), btn('canceled')],
    ],
  };
}

// Обработка нажатия inline-кнопки статуса. Привязывается через setWebhook на /tg.
async function handleTelegramCallback(request, env) {
  // Защита: только Telegram знает секрет (передаётся в заголовке при setWebhook).
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response('ok'); // не валидный JSON — игнорируем
  }

  const cq = update && update.callback_query;
  if (!cq || !cq.data || !cq.data.startsWith('s:')) {
    return new Response('ok'); // не наш апдейт — игнорируем
  }

  const parsed = parseStatusCallback(cq.data);
  if (!parsed) {
    await answerCallback(cq.id, 'Неизвестный статус', env);
    return new Response('ok');
  }
  const recordId = parsed.id;
  const status = parsed.status;
  const label = STATUS_LABELS[status];

  const patched = await patchAirtableStatus(recordId, status, env);

  if (!patched) {
    await answerCallback(cq.id, 'Не удалось обновить, попробуйте ещё', env);
    return new Response('ok');
  }

  // Зеркалим статус в сообщение: дописываем строку и подсвечиваем активную кнопку.
  const msg = cq.message;
  if (msg) {
    const baseText = msg.text || '';
    // Убираем прошлую строку статуса, если была, чтобы не плодить дубли.
    const cleaned = baseText.replace(/\n\nСтатус: .*$/s, '');
    const newText = `${cleaned}\n\nСтатус: ${label}`;
    const finished = status === 'done' || status === 'canceled';
    await tg('editMessageText', {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      text: newText,
      reply_markup: finished ? { inline_keyboard: [] } : statusKeyboard(recordId, status),
    }, env);
  }

  await answerCallback(cq.id, `Статус: ${label}`, env);
  return new Response('ok');
}

// PATCH статуса в Airtable. true при успехе, false при ошибке/отсутствии ключей.
async function patchAirtableStatus(recordId, status, env) {
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) return false;
  const table = env.AIRTABLE_ORDERS_TABLE || 'Orders';
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: { status }, typecast: true }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// Тост менеджеру при нажатии кнопки.
async function answerCallback(callbackQueryId, text, env) {
  await tg('answerCallbackQuery', { callback_query_id: callbackQueryId, text }, env).catch(() => {});
}

// Тонкая обёртка над Telegram Bot API.
async function tg(method, body, env) {
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
