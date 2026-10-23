-- Database of the internal area: the complete current schema, in one file.
-- One Supabase project, two isolated schemas: fjd_prod for production, fjd_staging for staging and
-- previews. Each has its own login role that can reach only its own schema (search_path, grants, row
-- level security). The roles start without login; the deploy step sets their passwords outside the repo.
--
-- Fresh installations use this file. Existing installations apply the matching
-- updates under migrations/ before deploying the corresponding app version.

create role fjd_prod_app nologin noinherit;
create role fjd_staging_app nologin noinherit;
create schema fjd_prod;
create schema fjd_staging;

-- ---------------------------------------------------------------- fjd_prod
create table fjd_prod.users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique check (discord_id ~ '^[0-9]{5,25}$'),
  discord_name text not null,
  avatar_url text,
  service_name text,
  honorific text check (honorific is null or char_length(honorific) <= 20),
  signature jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

-- Roles come only from the Discord roles of the guild (discord_role_map); nothing is granted by hand.
create table fjd_prod.roles (
  user_id uuid not null references fjd_prod.users(id) on delete cascade,
  role text not null check (role in ('sicherheitsrat', 'gouverneur', 'senatspraesident', 'justizminister', 'staatssekretaer', 'generalstaatsanwalt', 'richter', 'ogh_richter', 'oberster_richter', 'chief_of_police', 'revisionsleiter')),
  granted_by uuid references fjd_prod.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index roles_granted_by on fjd_prod.roles(granted_by);

-- Which Discord role of the guild stands for which role of the dashboard (kept by the Sicherheitsrat).
create table fjd_prod.discord_role_map (
  discord_role_id text primary key check (discord_role_id ~ '^[0-9]{5,25}$'),
  discord_role_name text not null,
  role text not null check (role in ('sicherheitsrat', 'gouverneur', 'senatspraesident', 'justizminister', 'staatssekretaer', 'generalstaatsanwalt', 'richter', 'ogh_richter', 'oberster_richter', 'chief_of_police', 'revisionsleiter'))
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
  signer_honorific text check (signer_honorific is null or char_length(signer_honorific) <= 20),
  signer_title text not null,
  signature_seed integer not null,
  signer_signature jsonb,
  issued_by uuid not null references fjd_prod.users(id),
  issued_at timestamptz not null default now(),
  unique (year, sequence)
);
create index documents_issued_at on fjd_prod.documents(issued_at desc);
create index documents_issued_by on fjd_prod.documents(issued_by);

-- Countersignatures (Gegenzeichnung): another office stamps an issued document.
create table fjd_prod.document_stamps (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references fjd_prod.documents(id) on delete cascade,
  slot text not null,
  role text not null,
  stamped_by uuid not null references fjd_prod.users(id),
  decision text not null,
  signer_name text not null,
  signer_honorific text,
  signer_title text not null,
  signature_seed integer not null,
  signer_signature jsonb,
  stamped_at timestamptz not null default now(),
  unique (document_id, slot),
  unique (document_id, stamped_by)
);
create index document_stamps_document on fjd_prod.document_stamps(document_id);
create index document_stamps_by on fjd_prod.document_stamps(stamped_by);

create table fjd_prod.document_announcements (
  document_id uuid primary key references fjd_prod.documents(id) on delete cascade
);

-- Only the app role may touch this schema; anon and authenticated (the Data API) get nothing.
revoke all on schema fjd_prod from public;
grant usage on schema fjd_prod to fjd_prod_app;
grant select, insert, update, delete on all tables in schema fjd_prod to fjd_prod_app;
alter role fjd_prod_app set search_path = fjd_prod;

-- Second line of defence: row level security, open only for the app role.
alter table fjd_prod.users enable row level security;
alter table fjd_prod.roles enable row level security;
alter table fjd_prod.discord_role_map enable row level security;
alter table fjd_prod.sessions enable row level security;
alter table fjd_prod.documents enable row level security;
alter table fjd_prod.document_stamps enable row level security;
alter table fjd_prod.document_announcements enable row level security;
create policy app_all on fjd_prod.users for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.roles for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.discord_role_map for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.sessions for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.documents for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.document_stamps for all to fjd_prod_app using (true) with check (true);
create policy app_all on fjd_prod.document_announcements for all to fjd_prod_app using (true) with check (true);

-- ---------------------------------------------------------------- fjd_staging
create table fjd_staging.users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique check (discord_id ~ '^[0-9]{5,25}$'),
  discord_name text not null,
  avatar_url text,
  service_name text,
  honorific text check (honorific is null or char_length(honorific) <= 20),
  signature jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

-- Roles come only from the Discord roles of the guild (discord_role_map); nothing is granted by hand.
create table fjd_staging.roles (
  user_id uuid not null references fjd_staging.users(id) on delete cascade,
  role text not null check (role in ('sicherheitsrat', 'gouverneur', 'senatspraesident', 'justizminister', 'staatssekretaer', 'generalstaatsanwalt', 'richter', 'ogh_richter', 'oberster_richter', 'chief_of_police', 'revisionsleiter')),
  granted_by uuid references fjd_staging.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index roles_granted_by on fjd_staging.roles(granted_by);

-- Which Discord role of the guild stands for which role of the dashboard (kept by the Sicherheitsrat).
create table fjd_staging.discord_role_map (
  discord_role_id text primary key check (discord_role_id ~ '^[0-9]{5,25}$'),
  discord_role_name text not null,
  role text not null check (role in ('sicherheitsrat', 'gouverneur', 'senatspraesident', 'justizminister', 'staatssekretaer', 'generalstaatsanwalt', 'richter', 'ogh_richter', 'oberster_richter', 'chief_of_police', 'revisionsleiter'))
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
  signer_honorific text check (signer_honorific is null or char_length(signer_honorific) <= 20),
  signer_title text not null,
  signature_seed integer not null,
  signer_signature jsonb,
  issued_by uuid not null references fjd_staging.users(id),
  issued_at timestamptz not null default now(),
  unique (year, sequence)
);
create index documents_issued_at on fjd_staging.documents(issued_at desc);
create index documents_issued_by on fjd_staging.documents(issued_by);

-- Countersignatures (Gegenzeichnung): another office stamps an issued document.
create table fjd_staging.document_stamps (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references fjd_staging.documents(id) on delete cascade,
  slot text not null,
  role text not null,
  stamped_by uuid not null references fjd_staging.users(id),
  decision text not null,
  signer_name text not null,
  signer_honorific text,
  signer_title text not null,
  signature_seed integer not null,
  signer_signature jsonb,
  stamped_at timestamptz not null default now(),
  unique (document_id, slot),
  unique (document_id, stamped_by)
);
create index document_stamps_document on fjd_staging.document_stamps(document_id);
create index document_stamps_by on fjd_staging.document_stamps(stamped_by);

create table fjd_staging.document_announcements (
  document_id uuid primary key references fjd_staging.documents(id) on delete cascade
);

-- Only the app role may touch this schema; anon and authenticated (the Data API) get nothing.
revoke all on schema fjd_staging from public;
grant usage on schema fjd_staging to fjd_staging_app;
grant select, insert, update, delete on all tables in schema fjd_staging to fjd_staging_app;
alter role fjd_staging_app set search_path = fjd_staging;

-- Second line of defence: row level security, open only for the app role.
alter table fjd_staging.users enable row level security;
alter table fjd_staging.roles enable row level security;
alter table fjd_staging.discord_role_map enable row level security;
alter table fjd_staging.sessions enable row level security;
alter table fjd_staging.documents enable row level security;
alter table fjd_staging.document_stamps enable row level security;
alter table fjd_staging.document_announcements enable row level security;
create policy app_all on fjd_staging.users for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.roles for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.discord_role_map for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.sessions for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.documents for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.document_stamps for all to fjd_staging_app using (true) with check (true);
create policy app_all on fjd_staging.document_announcements for all to fjd_staging_app using (true) with check (true);
