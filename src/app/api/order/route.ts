import { NextRequest, NextResponse } from 'next/server';
import { OrderPayload } from '@/types';

const volumeLabels: Record<string, string> = {
  '2ml': '2 мл',
  '5ml': '5 мл',
  '10ml': '10 мл',
  '50ml': '50 мл',
  '100ml': '100 мл',
};

export async function POST(req: NextRequest) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json(
      { error: 'Telegram не настроен. Проверьте переменные окружения.' },
      { status: 500 }
    );
  }

  let body: OrderPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const { name, contact, perfumeName, brand, volume, price } = body;

  if (!name || !contact || !perfumeName || !brand || !volume || !price) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const volumeLabel = volumeLabels[volume] ?? volume;
  const priceFormatted = price.toLocaleString('ru-RU');

  const message = [
    `🛍 <b>Новая заявка на покупку</b>`,
    ``,
    `👤 <b>Имя:</b> ${esc(name)}`,
    `📱 <b>Контакт:</b> ${esc(contact)}`,
    ``,
    `🌹 <b>Аромат:</b> ${esc(perfumeName)}`,
    `🏷 <b>Бренд:</b> ${esc(brand)}`,
    `📦 <b>Объём:</b> ${volumeLabel}`,
    `💰 <b>Цена:</b> ${priceFormatted} ₽`,
    ``,
    `⏱ ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`,
  ].join('\n');

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    if (!tgRes.ok) {
      const err = await tgRes.json();
      console.error('Telegram error:', err);
      return NextResponse.json({ error: 'Ошибка Telegram API' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Order route error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
