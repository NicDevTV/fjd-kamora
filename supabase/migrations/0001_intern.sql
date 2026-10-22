-- Internal area: users, roles, sessions and Amtsblatt documents.
-- Same structure as the local SQLite schema (src/lib/server/db/sqlite.ts).
-- Prepared for the staging and production projects; not applied anywhere yet.
--
-- Only the server talks to these tables, with the service role key. Row level security is on
-- and there are no policies, so the public anon key can read or write nothing at all.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique check (discord_id ~ '^[0-9]{5,25}$'),
  discord_name text not null,
  avatar_url text,
  service_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table public.roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('justizminister')),
  granted_by uuid references public.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.sessions (
  token_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user on public.sessions(user_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  year integer not null,
  sequence integer not null,
  template text not null,
  fields jsonb not null,
  signer_name text not null,
  signer_title text not null,
  signature_seed integer not null,
  issued_by uuid not null references public.users(id),
  issued_at timestamptz not null default now(),
  unique (year, sequence)
);

alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.sessions enable row level security;
alter table public.documents enable row level security;

-- Numbers documents without gaps or duplicates, even when two are issued at the same moment.
create function public.issue_document(
  p_template text,
  p_fields jsonb,
  p_signer_name text,
  p_signer_title text,
  p_signature_seed integer,
  p_issued_by uuid
) returns public.documents
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_year integer := extract(year from now() at time zone 'utc');
  v_sequence integer;
  v_document public.documents;
begin
  perform pg_advisory_xact_lock(hashtext('documents'), v_year);
  select coalesce(max(sequence), 0) + 1 into v_sequence from public.documents where year = v_year;
  insert into public.documents (number, year, sequence, template, fields, signer_name, signer_title, signature_seed, issued_by)
  values (format('AB-%s-%s', v_year, lpad(v_sequence::text, 4, '0')), v_year, v_sequence, p_template, p_fields,
          p_signer_name, p_signer_title, p_signature_seed, p_issued_by)
  returning * into v_document;
  return v_document;
end;
$$;

revoke all on function public.issue_document from public, anon, authenticated;
