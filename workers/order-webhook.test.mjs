import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatusCallback, buildOrderRows } from './order-webhook.js';

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
