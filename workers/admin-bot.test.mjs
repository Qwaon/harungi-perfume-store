import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  ADD_STEPS, nextAddStep, advanceAdd,
} from './admin-bot.js';

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

test('draftToPerfumeRow: полный draft → строка Supabase', () => {
  const draft = {
    id: 'dior-sauvage', name: 'Sauvage', brand: 'Christian Dior',
    description: 'свежий', gender: 'мужской', scentType: 'свежий', format: 'оригинал',
    price_5ml: 650, price_original: 14500, original_volume_ml: 100,
    notes_top: ['бергамот', 'перец'], images: ['https://x/a.jpg', 'https://x/b.jpg'],
    inStock: true, featured: true, newArrival: false, bestseller: true,
  };
  const row = draftToPerfumeRow(draft);
  assert.equal(row.id, 'dior-sauvage');
  assert.equal(row.notes_top, 'бергамот, перец');     // массив → CSV
  assert.equal(row.images, 'https://x/a.jpg, https://x/b.jpg');
  assert.equal(row.price_5ml, 650);
  assert.equal(row.inStock, true);
});

test('draftToPerfumeRow: пропущенные поля → null/false', () => {
  const row = draftToPerfumeRow({ id: 'x', name: 'X', brand: 'B' });
  assert.equal(row.price_5ml, null);
  assert.equal(row.notes_top, null);
  assert.equal(row.images, null);
  assert.equal(row.inStock, false);
  assert.equal(row.featured, false);
});

test('ADD_STEPS: порядок шагов начинается с name', () => {
  assert.equal(ADD_STEPS[0], 'name');
  assert.ok(ADD_STEPS.includes('photos'));
  assert.equal(ADD_STEPS[ADD_STEPS.length - 1], 'confirm');
});

test('nextAddStep: после name идёт brand', () => {
  assert.equal(nextAddStep('name', {}), 'brand');
});

test('nextAddStep: price_20ml всегда ведёт к price_original (его спрашиваем с Пропустить)', () => {
  assert.equal(nextAddStep('price_20ml', {}), 'price_original');
});

test('nextAddStep: original_volume_ml пропускается без price_original', () => {
  // после price_original, если цены оригинала нет в draft — пропускаем объём оригинала
  assert.equal(nextAddStep('price_original', { /* нет price_original */ }), 'notes_top');
});

test('nextAddStep: original_volume_ml включается при наличии price_original', () => {
  assert.equal(nextAddStep('price_original', { price_original: 14500 }), 'original_volume_ml');
});

test('advanceAdd: валидный ввод name → draft patched, переход к brand', () => {
  const res = advanceAdd('name', 'Sauvage', {});
  assert.equal(res.ok, true);
  assert.deepEqual(res.draftPatch, { name: 'Sauvage' });
  assert.equal(res.nextStep, 'brand');
});

test('advanceAdd: невалидная цена → ошибка, шаг не меняется', () => {
  const res = advanceAdd('price_5ml', 'abc', { name: 'X', brand: 'B' });
  assert.equal(res.ok, false);
  assert.equal(res.nextStep, 'price_5ml');
  assert.match(res.error, /число/);
});
