import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  parseCsv, ENUMS, MULTI_ENUMS, applyPriceDelta,
} from './catalog-logic.ts';

test('slugify: кириллица → латиница kebab', () => {
  assert.equal(slugify('Tom Ford', 'Black Orchid'), 'tom-ford-black-orchid');
  assert.equal(slugify('Кристиан Диор', 'Саваж'), 'kristian-dior-savazh');
});

test('makeUniqueId: коллизия → суффикс', () => {
  const ex = new Set(['a-b']);
  assert.equal(makeUniqueId('a-b', ex), 'a-b-2');
  assert.equal(makeUniqueId('c-d', ex), 'c-d');
});

test('validateField: обязательные/числа/enum', () => {
  assert.equal(validateField('name', '  ').ok, false);
  assert.equal(validateField('name', 'X').ok, true);
  assert.equal(validateField('price_5ml', 'abc').ok, false);
  assert.equal(validateField('price_5ml', '650').value, 650);
  assert.equal(validateField('gender', 'мужской').ok, true);
  assert.equal(validateField('gender', 'другое').ok, false);
});

test('parseCsv: строка → массив', () => {
  assert.deepEqual(parseCsv('осень, зима'), ['осень', 'зима']);
  assert.deepEqual(parseCsv(''), []);
});

test('draftToPerfumeRow: массивы → CSV, числа/флаги', () => {
  const row = draftToPerfumeRow({
    id: 'x', name: 'X', brand: 'B',
    notes_top: ['а', 'б'], season: ['зима'], occasion: ['вечер'],
    price_5ml: 650, inStock: true,
  });
  assert.equal(row.notes_top, 'а, б');
  assert.equal(row.season, 'зима');
  assert.equal(row.occasion, 'вечер');
  assert.equal(row.price_5ml, 650);
  assert.equal(row.inStock, true);
  assert.equal(row.price_10ml, null);
});

test('ENUMS/MULTI_ENUMS: значения совпадают с типами сайта', () => {
  assert.deepEqual(ENUMS.format, ['оригинал', 'распив']);
  assert.deepEqual(MULTI_ENUMS.season, ['весна', 'лето', 'осень', 'зима', 'всесезонный']);
});

test('applyPriceDelta: percent and fixed, rounding and clamping', () => {
  assert.equal(applyPriceDelta(1000, 'percent', 10), 1100);
  assert.equal(applyPriceDelta(1000, 'percent', -10), 900);
  assert.equal(applyPriceDelta(1000, 'fixed', 100), 1100);
  assert.equal(applyPriceDelta(1000, 'fixed', -1500), 0);
  assert.equal(applyPriceDelta(999, 'percent', 1), 1009); // 999*1.01=1008.99 -> round 1009
  assert.equal(applyPriceDelta(0, 'fixed', -50), 0);
});
