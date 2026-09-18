-- Bhasika AI Content Studio — initial schema
-- Apply with: psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
--         or: npm run db:migrate

create extension if not exists "pgcrypto";

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  name          text,
  role          text not null default 'admin',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists user_preferences (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users(id) on delete cascade,
  default_language        text not null default 'ne',
  default_duration        integer not null default 60,
  default_platform        text not null default 'instagram-reels',
  default_tone            text not null default 'relatable',
  learning_enabled        boolean not null default true,
  research_schedule       text not null default 'off',
  research_schedule_cron  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id)
);

create table if not exists ideas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  raw_text         text not null,
  title            text not null,
  category         text not null default 'other',
  language         text not null default 'ne',
  duration_seconds integer not null default 60,
  content_type     text not null default 'educational',
  audience         text not null default 'nepali-students',
  audience_custom  text,
  platform         text not null default 'instagram-reels',
  tone             text not null default 'relatable',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists ideas_user_created_idx on ideas (user_id, created_at desc);

create table if not exists research_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  idea_id    uuid references ideas(id) on delete set null,
  query      text not null,
  status     text not null default 'searching',
  provider   text not null default 'demo',
  is_demo    boolean not null default false,
  queries    jsonb not null default '[]'::jsonb,
  facts      jsonb not null default '[]'::jsonb,
  conflicts  jsonb not null default '[]'::jsonb,
  summary    text not null default '',
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_sessions_user_created_idx on research_sessions (user_id, created_at desc);

create table if not exists research_sources (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  session_id   uuid not null references research_sessions(id) on delete cascade,
  title        text not null,
  url          text not null,
  domain       text not null,
  excerpt      text not null default '',
  published_at text,
  source_type  text not null default 'unknown',
  relevance    integer not null default 50,
  verification text not null default 'needs-verification',
  selected     boolean not null default false,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists research_sources_session_idx on research_sources (session_id, relevance desc);

create table if not exists audience_problems (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  session_id        uuid references research_sessions(id) on delete set null,
  title             text not null,
  excerpt           text not null default '',
  platform          text not null default 'web',
  source_name       text not null default '',
  source_url        text not null,
  retrieved_at      timestamptz not null default now(),
  posted_at         timestamptz,
  category          text not null default 'other',
  language          text not null default 'en',
  relevance         integer not null default 50,
  status            text not null default 'new',
  analysis          jsonb,
  related_questions jsonb not null default '[]'::jsonb,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists audience_problems_user_created_idx on audience_problems (user_id, created_at desc);
create index if not exists audience_problems_category_idx on audience_problems (user_id, category);
create unique index if not exists audience_problems_user_url_idx on audience_problems (user_id, source_url);

create table if not exists scripts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  idea_id             uuid references ideas(id) on delete set null,
  problem_id          uuid references audience_problems(id) on delete set null,
  research_session_id uuid references research_sessions(id) on delete set null,
  title               text not null,
  language            text not null default 'ne',
  duration_seconds    integer not null default 60,
  platform            text not null default 'instagram-reels',
  category            text not null default 'other',
  content_type        text not null default 'educational',
  audience            text not null default 'nepali-students',
  tone                text not null default 'relatable',
  hook_style          text,
  sections            jsonb not null default '[]'::jsonb,
  sources             jsonb not null default '[]'::jsonb,
  status              text not null default 'draft',
  is_demo             boolean not null default false,
  version_count       integer not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists scripts_user_updated_idx on scripts (user_id, updated_at desc);

create table if not exists script_versions (
  id         uuid primary key default gen_random_uuid(),
  script_id  uuid not null references scripts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  version    integer not null,
  sections   jsonb not null default '[]'::jsonb,
  label      text not null default '',
  created_at timestamptz not null default now(),
  unique (script_id, version)
);

create table if not exists behavior_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists behavior_events_user_created_idx on behavior_events (user_id, created_at desc);

create table if not exists scheduled_syncs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  source      text not null,
  frequency   text not null default 'off',
  cron        text,
  last_run_at timestamptz,
  last_status text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists login_attempts (
  id         uuid primary key default gen_random_uuid(),
  identifier text not null,
  succeeded  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_identifier_idx on login_attempts (identifier, created_at desc);

-- Row level security.
-- The app connects with the service role and scopes every query by user_id in
-- application code. RLS is enabled so that any other client (for example the
-- Supabase anon key) cannot read another user's rows.
alter table users             enable row level security;
alter table user_preferences  enable row level security;
alter table ideas             enable row level security;
alter table research_sessions enable row level security;
alter table research_sources  enable row level security;
alter table audience_problems enable row level security;
alter table scripts           enable row level security;
alter table script_versions   enable row level security;
alter table behavior_events   enable row level security;
alter table scheduled_syncs   enable row level security;
alter table login_attempts    enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_preferences','ideas','research_sessions','research_sources',
    'audience_problems','scripts','script_versions','behavior_events','scheduled_syncs'
  ] loop
    begin
      execute format(
        'create policy %I on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
        t || '_own_rows', t
      );
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
