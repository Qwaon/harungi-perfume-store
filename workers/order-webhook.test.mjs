import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatusCallback, buildOrderRows, verifyInitData } from './order-webhook.js';

test('parseStatusCallback: валидный s:42:accepted', () => {
  assert.deepEqual(parseStatusCallback('s:42:accepted'), { id: '42', status: 'accepted' });
});

test('parseStatusCallback: не наш префикс → null', () => {
  assert.equal(parseStatusCallback('x:42:accepted'), null);
});

test('parseStatusCallback: неизвестный статус → null', () => {
  assert.equal(parseStatusCallback('s:42:bogus'), null);
});

test('parseStatusCallback: нет id → null', () => {
  assert.equal(parseStatusCallback('s::accepted'), null);
});

test('buildOrderRows: одиночный заказ', () => {
  const payload = {
    name: 'Иван', contact: '@ivan', type: 'single', messageType: 'order',
    perfumeId: 'dior-sauvage', perfumeName: 'Sauvage', brand: 'Dior',
    volume: '5ml', volumeLabel: '5 мл', price: 650,
    source: 'site', pageUrl: 'https://x/p', tgUserId: '111',
  };
  const { order, items } = buildOrderRows(payload);
  assert.equal(order.customer_name, 'Иван');
  assert.equal(order.type, 'single');
  assert.equal(order.total, 650);
  assert.equal(order.tg_user_id, 111);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    perfume_id: 'dior-sauvage', perfume_name: 'Sauvage', brand: 'Dior',
    volume: '5 мл', quantity: 1, price: 650,
  });
});

test('buildOrderRows: заказ-корзина с количеством', () => {
  const payload = {
    name: 'Пётр', contact: '+79990001122', type: 'cart',
    items: [
      { perfumeId: 'a', perfumeName: 'A', brand: 'BrA', volume: '5ml', volumeLabel: '5 мл', price: 100, quantity: 2 },
      { perfumeId: 'b', perfumeName: 'B', brand: 'BrB', volume: '10ml', volumeLabel: '10 мл', price: 300, quantity: 1 },
    ],
    total: 500, source: 'tg', pageUrl: 'https://x/cart',
  };
  const { order, items } = buildOrderRows(payload);
  assert.equal(order.type, 'cart');
  assert.equal(order.total, 500);
  assert.equal(order.tg_user_id, null);   // нет tgUserId
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[1].price, 300);
});

test('buildOrderRows: консультация → type consultation', () => {
  const payload = {
    name: 'Анна', contact: '@anna', type: 'consultation', messageType: 'consultation',
    perfumeId: 'x', perfumeName: 'X', brand: 'Br', volume: '5ml', volumeLabel: '5 мл', price: 0,
    source: 'site', pageUrl: 'https://x',
  };
  const { order } = buildOrderRows(payload);
  assert.equal(order.type, 'consultation');
});

// Хелпер: собрать валидный initData с правильным hash (схема Telegram Web App).
async function makeInitData(botToken, userId, authDate) {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('user', JSON.stringify({ id: userId, first_name: 'Test' }));
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort();
  const dcs = pairs.join('\n');
  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.importKey('raw', enc.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', secretKey, enc.encode(botToken));
  const hk = await crypto.subtle.importKey('raw', secret,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', hk, enc.encode(dcs));
  const hashHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  params.set('hash', hashHex);
  return params.toString();
}

const BOT = '123456:TESTTOKEN';

test('verifyInitData: валидная подпись → ok + userId', async () => {
  const now = Math.floor(Date.now() / 1000);
  const initData = await makeInitData(BOT, 777, now);
  const res = await verifyInitData(initData, BOT);
  assert.equal(res.ok, true);
  assert.equal(res.userId, 777);
});

test('verifyInitData: искажённый hash → fail', async () => {
  const now = Math.floor(Date.now() / 1000);
  let initData = await makeInitData(BOT, 777, now);
  initData = initData.replace(/hash=[a-f0-9]+/, 'hash=deadbeef');
  const res = await verifyInitData(initData, BOT);
  assert.equal(res.ok, false);
});

test('verifyInitData: чужой токен → fail', async () => {
  const now = Math.floor(Date.now() / 1000);
  const initData = await makeInitData(BOT, 777, now);
  const res = await verifyInitData(initData, 'другой:токен');
  assert.equal(res.ok, false);
});

test('verifyInitData: протухший auth_date → fail', async () => {
  const old = Math.floor(Date.now() / 1000) - 25 * 60 * 60;  // 25ч назад
  const initData = await makeInitData(BOT, 777, old);
  const res = await verifyInitData(initData, BOT);
  assert.equal(res.ok, false);
});
