import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, makeUniqueId } from './admin-bot.js';

test('slugify: латиница → kebab-case', () => {
  assert.equal(slugify('Tom Ford', 'Black Orchid'), 'tom-ford-black-orchid');
});

test('slugify: транслитерация кириллицы', () => {
  assert.equal(slugify('Шанель', 'Шанс'), 'shanel-shans');
});

test('slugify: убирает спецсимволы и схлопывает дефисы', () => {
  assert.equal(slugify('Yves Saint-Laurent', 'L’Homme!!!'), 'yves-saint-laurent-l-homme');
});

test('makeUniqueId: без коллизии возвращает базовый id', () => {
  assert.equal(makeUniqueId('dior-sauvage', new Set()), 'dior-sauvage');
});

test('makeUniqueId: при коллизии добавляет суффикс', () => {
  const existing = new Set(['dior-sauvage', 'dior-sauvage-2']);
  assert.equal(makeUniqueId('dior-sauvage', existing), 'dior-sauvage-3');
});
