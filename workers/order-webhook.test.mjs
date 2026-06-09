import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatusCallback } from './order-webhook.js';

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
