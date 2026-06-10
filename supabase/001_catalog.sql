-- supabase/001_catalog.sql
-- Этап 1 миграции на Supabase: таблица каталога (схема 1:1 с Airtable Catalog).
-- Сгенерировано scripts/gen-supabase-sql.mjs из src/data/perfumes.json.
-- Выполнить целиком в Supabase → SQL Editor → New query → Run.

create table if not exists perfumes (
  id                text primary key,
  name              text not null,
  brand             text,
  description       text,
  notes_top         text,   -- CSV: "нота, нота"
  notes_middle      text,   -- CSV
  notes_base        text,   -- CSV
  gender            text,   -- single select: мужской/женский/унисекс
  "scentType"       text,   -- single select
  format            text,   -- single select: распив/оригинал
  images            text,   -- CSV URL
  price_5ml         numeric,
  price_10ml        numeric,
  price_15ml        numeric,
  price_20ml        numeric,
  price_original    numeric,
  original_volume_ml numeric,
  "inStock"         boolean default true,
  featured          boolean default false,
  "newArrival"      boolean default false,
  bestseller        boolean default false
);

-- Row Level Security: публичный read-only доступ (для anon-ключа сайта).
alter table perfumes enable row level security;

drop policy if exists "public read perfumes" on perfumes;
create policy "public read perfumes"
  on perfumes for select
  to anon, authenticated
  using (true);

-- Заливка данных (idempotent: повторный запуск обновит существующие строки).

insert into perfumes (id, name, brand, description, notes_top, notes_middle, notes_base, gender, "scentType", format, images, price_5ml, price_10ml, price_15ml, price_20ml, price_original, original_volume_ml, "inStock", featured, "newArrival", bestseller) values
  ('tom-ford-black-orchid', 'Black Orchid', 'Tom Ford', 'Трюфель, орхидея и тёмный пачули — соблазн без объяснений. Black Orchid не просит внимания: он его берёт.', NULL, NULL, NULL, 'женский', 'восточный', 'распив', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80', 850, 1500, NULL, NULL, NULL, NULL, false, true, true, false),
  ('dior-sauvage', 'Sauvage', 'Christian Dior', 'Бергамот и перец на открытом воздухе — резкий, свободный, без компромиссов. Один из самых узнаваемых силуэтов в современной парфюмерии.', NULL, NULL, NULL, 'мужской', 'свежий', 'оригинал', 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&q=80', 650, 1200, 2500, 5000, 14500, 100, true, true, true, true),
  ('baccarat-rouge-540', 'Baccarat Rouge 540', 'Maison Francis Kurkdjian', 'Шафран и жасмин сгорают в янтарном свете — остаётся золотистый шлейф, который невозможно забыть. Культовый аромат современности: тёплый, лучезарный, стойкий.', NULL, NULL, NULL, 'унисекс', 'восточный', 'распив', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80, https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80', 950, 1700, NULL, NULL, NULL, NULL, true, true, true, true)
on conflict (id) do update set
  name = excluded.name,
  brand = excluded.brand,
  description = excluded.description,
  notes_top = excluded.notes_top,
  notes_middle = excluded.notes_middle,
  notes_base = excluded.notes_base,
  gender = excluded.gender,
  "scentType" = excluded."scentType",
  format = excluded.format,
  images = excluded.images,
  price_5ml = excluded.price_5ml,
  price_10ml = excluded.price_10ml,
  price_15ml = excluded.price_15ml,
  price_20ml = excluded.price_20ml,
  price_original = excluded.price_original,
  original_volume_ml = excluded.original_volume_ml,
  "inStock" = excluded."inStock",
  featured = excluded.featured,
  "newArrival" = excluded."newArrival",
  bestseller = excluded.bestseller;
