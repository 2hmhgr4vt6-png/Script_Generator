-- Content performance analysis and trend research.
--
-- Each row is a snapshot: engagement counters and trend volumes are read at a
-- moment in time and are not re-fetched, so a saved report stays a record of
-- what was true when it was taken.

create table if not exists performance_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  topic        text not null default '',
  region       text not null default 'global',
  is_demo      boolean not null default false,
  signals      jsonb not null default '[]'::jsonb,
  patterns     jsonb not null default '[]'::jsonb,
  formats      jsonb not null default '[]'::jsonb,
  summary      text not null default '',
  source_notes jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists performance_reports_user_created_idx
  on performance_reports (user_id, created_at desc);

create table if not exists trend_scans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  region       text not null default 'NP',
  is_demo      boolean not null default false,
  trends       jsonb not null default '[]'::jsonb,
  angles       jsonb not null default '[]'::jsonb,
  summary      text not null default '',
  source_notes jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists trend_scans_user_created_idx on trend_scans (user_id, created_at desc);

alter table performance_reports enable row level security;
alter table trend_scans         enable row level security;
