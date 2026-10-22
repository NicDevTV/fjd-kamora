-- Internal area of the FJD site: users, roles, sessions and Amtsblatt documents.
-- One Supabase project, two isolated schemas: fjd_prod for production, fjd_staging for
-- staging and previews. Each has its own login role that can reach only its own schema.
-- The roles start without login; the deploy step sets their passwords outside the repo.

create role fjd_prod_app nologin noinherit;
create role fjd_staging_app nologin noinherit;
create schema fjd_prod;
create schema fjd_staging;

create table fjd_prod.users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique check (discord_id ~ '^[0-9]{5,25}$'),
  discord_name text not null,
  avatar_url text,
  service_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);
create table fjd_prod.roles (
  user_id uuid not null references fjd_prod.users(id) on delete cascade,
  role text not null check (role in ('justizminister', 'foederationsrat')),
  granted_by uuid references fjd_prod.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table fjd_prod.sessions (
  token_hash text primary key,
  user_id uuid not null references fjd_prod.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user on fjd_prod.sessions(user_id);
create table fjd_prod.documents (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  year integer not null,
  sequence integer not null,
  template text not null,
  fields jsonb not null,
  signer_name text not null,
  signer_title text not null,
  signature_seed integer not null,
  issued_by uuid not null references fjd_prod.users(id),
  issued_at timestamptz not null default now(),
  unique (year, sequence)
);
create index documents_issued_at on fjd_prod.documents(issued_at desc);
create index documents_issued_by on fjd_prod.documents(issued_by);
create index roles_granted_by on fjd_prod.roles(granted_by);

-- Only the app role may touch this schema; anon and authenticated (the Data API) get nothing.
revoke all on schema fjd_prod from public;
grant usage on schema fjd_prod to fjd_prod_app;
grant select, insert, update, delete on all tables in schema fjd_prod to fjd_prod_app;
alter role fjd_prod_app set search_path = fjd_prod;

-- Second line of defence: row level security, open only for the app role.
alter table fjd_prod.users enable row level security;
alter table fjd_prod.roles enable row level security;
alter table fjd_prod.sessions enable row level security;
alter table fjd_prod.documents enable row level security;
create policy app_all on fjd_prod.users for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.roles for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.sessions for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.documents for all to fjd_prod_app using (true) with check (true);

create table fjd_staging.users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique check (discord_id ~ '^[0-9]{5,25}$'),
  discord_name text not null,
  avatar_url text,
  service_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);
create table fjd_staging.roles (
  user_id uuid not null references fjd_staging.users(id) on delete cascade,
  role text not null check (role in ('justizminister', 'foederationsrat')),
  granted_by uuid references fjd_staging.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table fjd_staging.sessions (
  token_hash text primary key,
  user_id uuid not null references fjd_staging.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user on fjd_staging.sessions(user_id);
create table fjd_staging.documents (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  year integer not null,
  sequence integer not null,
  template text not null,
  fields jsonb not null,
  signer_name text not null,
  signer_title text not null,
  signature_seed integer not null,
  issued_by uuid not null references fjd_staging.users(id),
  issued_at timestamptz not null default now(),
  unique (year, sequence)
);
create index documents_issued_at on fjd_staging.documents(issued_at desc);
create index documents_issued_by on fjd_staging.documents(issued_by);
create index roles_granted_by on fjd_staging.roles(granted_by);

-- Only the app role may touch this schema; anon and authenticated (the Data API) get nothing.
revoke all on schema fjd_staging from public;
grant usage on schema fjd_staging to fjd_staging_app;
grant select, insert, update, delete on all tables in schema fjd_staging to fjd_staging_app;
alter role fjd_staging_app set search_path = fjd_staging;

-- Second line of defence: row level security, open only for the app role.
alter table fjd_staging.users enable row level security;
alter table fjd_staging.roles enable row level security;
alter table fjd_staging.sessions enable row level security;
alter table fjd_staging.documents enable row level security;
create policy app_all on fjd_staging.users for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.roles for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.sessions for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.documents for all to fjd_staging_app using (true) with check (true);
