import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession } from './session.ts';

const SECRET = 'test-secret-123';

test('verify принимает свежую подпись', async () => {
  const token = await signSession(SECRET, 7 * 24 * 3600);
  assert.equal(await verifySession(SECRET, token), true);
});

test('verify отвергает подделанную подпись', async () => {
  const token = await signSession(SECRET, 3600);
  const tampered = token.slice(0, -2) + 'xx';
  assert.equal(await verifySession(SECRET, tampered), false);
});

test('verify отвергает другой секрет', async () => {
  const token = await signSession(SECRET, 3600);
  assert.equal(await verifySession('other', token), false);
});

test('verify отвергает протухший токен', async () => {
  const token = await signSession(SECRET, -1); // уже истёк
  assert.equal(await verifySession(SECRET, token), false);
});

test('verify отвергает мусор', async () => {
  assert.equal(await verifySession(SECRET, ''), false);
  assert.equal(await verifySession(SECRET, 'abc'), false);
});
