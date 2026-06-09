-- supabase/002_admin.sql
-- Этап 2 миграции: состояние пошагового диалога админ-бота.
-- Выполнить целиком в Supabase → SQL Editor → Run.
-- Бакет perfume-images создаётся отдельно (см. конец файла).

create table if not exists admin_sessions (
  tg_user_id     bigint primary key,    -- один активный диалог на админа
  flow           text,                  -- 'add' | 'edit' | 'delete'
  step           text,                  -- текущий шаг диалога
  draft          jsonb default '{}'::jsonb,  -- накопленные поля
  target_id      text,                  -- id аромата при edit/delete (null при add)
  last_update_id bigint,                -- idempotency: последний обработанный update_id
  updated_at     timestamptz default now()
);

-- RLS включён БЕЗ политик: publishable-ключ сайта эту таблицу не видит.
-- Доступ только у service_role (обходит RLS).
alter table admin_sessions enable row level security;

-- --- Storage-бакет (выполнить в Supabase → Storage → New bucket вручную) ---
-- Имя: perfume-images
-- Public bucket: ВКЛ (фото открыты по прямой ссылке, как Unsplash)
-- После создания бакет доступен по:
--   https://<ref>.supabase.co/storage/v1/object/public/perfume-images/<file>
