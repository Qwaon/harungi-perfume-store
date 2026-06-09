import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, makeUniqueId, validateField } from './admin-bot.js';

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

test('validateField: name пустой → ошибка', () => {
  assert.deepEqual(validateField('name', '  '), { ok: false, error: 'Поле не может быть пустым' });
});

test('validateField: name валиден', () => {
  assert.deepEqual(validateField('name', 'Sauvage'), { ok: true, value: 'Sauvage' });
});

test('validateField: цена не число → ошибка', () => {
  assert.deepEqual(validateField('price_5ml', 'abc'), { ok: false, error: 'Введите число' });
});

test('validateField: цена число → ok, приводит к Number', () => {
  assert.deepEqual(validateField('price_5ml', '850'), { ok: true, value: 850 });
});

test('validateField: gender вне допустимых → ошибка', () => {
  assert.equal(validateField('gender', 'робот').ok, false);
});

test('validateField: gender валиден', () => {
  assert.deepEqual(validateField('gender', 'мужской'), { ok: true, value: 'мужской' });
});
