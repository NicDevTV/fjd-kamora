-- Run once as the schema owner before deploying this version. The transaction
-- preserves old signatures and aborts if historical data violates uniqueness.
begin;
do $$
declare app_schema text;
begin
  foreach app_schema in array array['fjd_prod', 'fjd_staging'] loop
    execute format('alter table %I.roles drop constraint roles_role_check', app_schema);
    execute format('alter table %I.roles add constraint roles_role_check check (role in
      (''sicherheitsrat'', ''gouverneur'', ''senatspraesident'', ''justizminister'', ''staatssekretaer'',
       ''generalstaatsanwalt'', ''richter'', ''ogh_richter'', ''oberster_richter'', ''chief_of_police'', ''revisionsleiter''))', app_schema);
    execute format('alter table %I.discord_role_map drop constraint discord_role_map_role_check', app_schema);
    execute format('alter table %I.discord_role_map add constraint discord_role_map_role_check check (role in
      (''sicherheitsrat'', ''gouverneur'', ''senatspraesident'', ''justizminister'', ''staatssekretaer'',
       ''generalstaatsanwalt'', ''richter'', ''ogh_richter'', ''oberster_richter'', ''chief_of_police'', ''revisionsleiter''))', app_schema);
    execute format('alter table %I.document_stamps add column slot text', app_schema);
    execute format('update %I.document_stamps set slot = role', app_schema);
    execute format('alter table %I.document_stamps alter column slot set not null', app_schema);
    execute format('alter table %I.document_stamps drop constraint document_stamps_document_id_role_key', app_schema);
    execute format('alter table %I.document_stamps add unique (document_id, slot)', app_schema);
    execute format('alter table %I.document_stamps add unique (document_id, stamped_by)', app_schema);
    execute format('create table %I.document_announcements (document_id uuid primary key references %I.documents(id) on delete cascade)', app_schema, app_schema);
    execute format('alter table %I.document_announcements enable row level security', app_schema);
    execute format('grant select, insert, delete on %I.document_announcements to %I', app_schema, app_schema || '_app');
    execute format('create policy app_all on %I.document_announcements for all to %I using (true) with check (true)', app_schema, app_schema || '_app');
  end loop;
end $$;
commit;
