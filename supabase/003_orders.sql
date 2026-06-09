-- supabase/003_orders.sql
-- Этап 3 миграции: заказы (нормализованно). Выполнить в Supabase → SQL Editor → Run.

create table if not exists orders (
  id            bigint generated always as identity primary key,
  order_number  bigint generated always as identity,  -- человекочитаемый (аналог Airtable Autonumber)
  status        text not null default 'new',          -- new/accepted/shipped/done/canceled
  customer_name text,
  contact       text,
  total         numeric,
  type          text,                                 -- single/cart/consultation
  source        text,
  page_url      text,
  tg_user_id    bigint,                               -- для истории Mini App
  note          text,
  created_at    timestamptz default now()
);

create table if not exists order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references orders(id) on delete cascade,
  perfume_id   text references perfumes(id) on delete set null,  -- мягкая ссылка
  perfume_name text,
  brand        text,
  volume       text,
  quantity     int default 1,
  price        numeric
);

create index if not exists orders_tg_user_id_idx on orders(tg_user_id);
create index if not exists order_items_order_id_idx on order_items(order_id);

-- RLS: обе таблицы включены БЕЗ публичных политик — доступ только service_role (Worker).
alter table orders enable row level security;
alter table order_items enable row level security;
