-- API credentials entered through Settings.
--
-- Secret fields are stored as AES-256-GCM ciphertext (see src/lib/credentials);
-- non-secret fields such as the model name or search provider are stored as
-- plain text. Nothing here is ever returned to the browser.

create table if not exists api_integrations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  provider          text not null,
  config            jsonb not null default '{}'::jsonb,
  last_tested_at    timestamptz,
  last_test_status  text,
  last_test_message text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists api_integrations_user_idx on api_integrations (user_id);

alter table api_integrations enable row level security;
