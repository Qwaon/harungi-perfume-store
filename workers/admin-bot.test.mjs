import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, makeUniqueId, validateField, draftToPerfumeRow,
  ADD_STEPS, nextAddStep, advanceAdd,
  isAllowed, parseAllowlist,
  paginate, EDIT_FIELDS, editFieldsKeyboard, buildScreen,
  parseCsv, multiKeyboard, MULTI_ENUMS,
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
  assert.equal(row.season, null);    // не задано → null (сайт авто-выведет)
  assert.equal(row.occasion, null);
});

test('draftToPerfumeRow: season/occasion (массивы) → CSV', () => {
  const row = draftToPerfumeRow({ id: 'x', name: 'X', brand: 'B', season: ['осень', 'зима'], occasion: ['вечер'] });
  assert.equal(row.season, 'осень, зима');
  assert.equal(row.occasion, 'вечер');
});

// --- season/occasion: множественный выбор ---

test('parseCsv: CSV-строка → массив (trim, без пустых)', () => {
  assert.deepEqual(parseCsv('осень, зима'), ['осень', 'зима']);
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv(null), []);
});

test('EDIT_FIELDS: season/occasion размечены как multi', () => {
  const byKey = Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, f.kind]));
  assert.equal(byKey.season, 'multi');
  assert.equal(byKey.occasion, 'multi');
});

test('MULTI_ENUMS: допустимые значения сезона совпадают с типами сайта', () => {
  assert.deepEqual(MULTI_ENUMS.season, ['весна', 'лето', 'осень', 'зима', 'всесезонный']);
});

test('multiKeyboard: отмечает выбранные галочкой + кнопка Готово', () => {
  const kb = multiKeyboard('dior-sauvage', 'season', ['зима']);
  const flat = kb.inline_keyboard.flat();
  const winter = flat.find((b) => b.callback_data === 'mset:dior-sauvage:season:зима');
  const spring = flat.find((b) => b.callback_data === 'mset:dior-sauvage:season:весна');
  assert.ok(winter.text.includes('☑'));
  assert.ok(spring.text.includes('☐'));
  const done = flat.find((b) => b.callback_data === 'mdone:dior-sauvage:season');
  assert.ok(done, 'нет кнопки Готово');
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

test('parseAllowlist: CSV → Set чисел', () => {
  const set = parseAllowlist('111, 222 ,333');
  assert.ok(set.has(111) && set.has(222) && set.has(333));
});

test('parseAllowlist: пусто → пустой Set', () => {
  assert.equal(parseAllowlist('').size, 0);
  assert.equal(parseAllowlist(undefined).size, 0);
});

test('isAllowed: id в списке → true', () => {
  assert.equal(isAllowed(222, '111,222'), true);
});

test('isAllowed: id не в списке → false', () => {
  assert.equal(isAllowed(999, '111,222'), false);
});

test('isAllowed: пустой allowlist → false (fail-closed)', () => {
  assert.equal(isAllowed(111, ''), false);
});

// --- paginate ---

test('paginate: первая страница из многих → срез + hasNext, без hasPrev', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const r = paginate(items, 0, 8);
  assert.deepEqual(r.slice, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(r.page, 0);
  assert.equal(r.pages, 3);
  assert.equal(r.hasPrev, false);
  assert.equal(r.hasNext, true);
});

test('paginate: последняя страница → частичный срез, hasPrev, без hasNext', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const r = paginate(items, 2, 8);
  assert.deepEqual(r.slice, [16, 17, 18, 19]);
  assert.equal(r.hasPrev, true);
  assert.equal(r.hasNext, false);
});

test('paginate: страница за пределами → кламп к последней', () => {
  const items = [1, 2, 3];
  const r = paginate(items, 9, 8);
  assert.equal(r.page, 0);
  assert.equal(r.pages, 1);
});

test('paginate: пустой список → 1 страница, пустой срез', () => {
  const r = paginate([], 0, 8);
  assert.deepEqual(r.slice, []);
  assert.equal(r.pages, 1);
  assert.equal(r.hasPrev, false);
  assert.equal(r.hasNext, false);
});

// --- EDIT_FIELDS / editFieldsKeyboard ---

test('EDIT_FIELDS: содержит все редактируемые колонки', () => {
  const keys = EDIT_FIELDS.map((f) => f.key);
  for (const k of [
    'name', 'brand', 'description',
    'price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original', 'original_volume_ml',
    'gender', 'scentType', 'format',
    'notes_top', 'notes_middle', 'notes_base',
    'inStock', 'featured', 'newArrival', 'bestseller',
  ]) {
    assert.ok(keys.includes(k), `нет поля ${k}`);
  }
});

test('EDIT_FIELDS: типы полей размечены', () => {
  const byKey = Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, f.kind]));
  assert.equal(byKey.name, 'text');
  assert.equal(byKey.price_5ml, 'text');
  assert.equal(byKey.gender, 'enum');
  assert.equal(byKey.inStock, 'bool');
});

test('editFieldsKeyboard: булевы поля показывают текущее состояние тумблером', () => {
  const kb = editFieldsKeyboard('dior-sauvage', { inStock: true, featured: false });
  const flat = kb.inline_keyboard.flat();
  const inStockBtn = flat.find((b) => b.callback_data === 'efield:dior-sauvage:inStock');
  assert.ok(inStockBtn.text.includes('☑'));
  const featuredBtn = flat.find((b) => b.callback_data === 'efield:dior-sauvage:featured');
  assert.ok(featuredBtn.text.includes('☐'));
});

test('editFieldsKeyboard: содержит управление фото и возврат к карточке', () => {
  const kb = editFieldsKeyboard('x', {});
  const flat = kb.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'ephoto:add:x'));
  assert.ok(flat.some((b) => b.callback_data === 'ephoto:clear:x'));
  assert.ok(flat.some((b) => b.callback_data === 'card:x'));
});

// --- buildScreen ---

test('buildScreen menu: текст + кнопки Добавить/Список', () => {
  const s = buildScreen('menu', {});
  assert.match(s.text, /Каталог HARUNGI/);
  const flat = s.reply_markup.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'm:add'));
  assert.ok(flat.some((b) => b.callback_data === 'list:0'));
});

test('buildScreen list: кнопки ароматов + пагинация + В меню', () => {
  const perfumes = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, brand: 'B', name: `N${i}` }));
  const s = buildScreen('list', { perfumes, page: 0 });
  const flat = s.reply_markup.inline_keyboard.flat();
  const picks = flat.filter((b) => b.callback_data.startsWith('pick:'));
  assert.equal(picks.length, 8);
  assert.ok(flat.some((b) => b.callback_data === 'list:1'));
  assert.ok(!flat.some((b) => b.callback_data === 'list:-1'));
  assert.ok(flat.some((b) => b.callback_data === 'm:menu'));
  assert.match(s.text, /1\s*\/\s*2/);
});

test('buildScreen list: вторая страница → есть Назад, нет Далее', () => {
  const perfumes = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, brand: 'B', name: `N${i}` }));
  const s = buildScreen('list', { perfumes, page: 1 });
  const flat = s.reply_markup.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'list:0'));
  assert.ok(!flat.some((b) => b.callback_data === 'list:2'));
});

test('buildScreen list: пусто → сообщение и только В меню', () => {
  const s = buildScreen('list', { perfumes: [], page: 0 });
  assert.match(s.text, /пуст/i);
  const flat = s.reply_markup.inline_keyboard.flat();
  assert.ok(flat.some((b) => b.callback_data === 'm:menu'));
});
