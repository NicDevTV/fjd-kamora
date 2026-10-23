-- psql variables: schema=fjd_prod, app_role=fjd_prod_app.
-- All fixtures are rolled back. Run against an isolated test database only.
begin;
set local role :"app_role";
set local search_path to :"schema";
do $$
declare issuer uuid; second_judge uuid; third_judge uuid; doc uuid; n integer;
begin
  insert into users(discord_id, discord_name) values ('99999000001', 'QA issuer') returning id into issuer;
  insert into users(discord_id, discord_name) values ('99999000002', 'QA judge 2') returning id into second_judge;
  insert into users(discord_id, discord_name) values ('99999000003', 'QA judge 3') returning id into third_judge;
  insert into roles(user_id, role) values (issuer, 'ogh_richter');
  insert into discord_role_map(discord_role_id, discord_role_name, role) values ('99999000004', 'QA OGH', 'ogh_richter');
  insert into documents(number, year, sequence, template, fields, signer_name, signer_title, signature_seed, issued_by)
    values ('AB-QA-0001', 2000, 1, 'parteiverbot', '{}', 'QA issuer', 'OGH-Richter', 1, issuer) returning id into doc;
  insert into document_stamps(document_id, slot, role, stamped_by, decision, signer_name, signer_title, signature_seed)
    values (doc, 'ogh-judge-2', 'ogh_richter', second_judge, 'zugestimmt', 'QA judge 2', 'OGH-Richter', 1);
  begin
    insert into document_stamps(document_id, slot, role, stamped_by, decision, signer_name, signer_title, signature_seed)
      values (doc, 'ogh-judge-3', 'ogh_richter', second_judge, 'zugestimmt', 'QA judge 2', 'OGH-Richter', 1);
    raise exception 'Duplicate person accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into document_stamps(document_id, slot, role, stamped_by, decision, signer_name, signer_title, signature_seed)
      values (doc, 'ogh-judge-2', 'ogh_richter', third_judge, 'zugestimmt', 'QA judge 3', 'OGH-Richter', 1);
    raise exception 'Duplicate position accepted';
  exception when unique_violation then null;
  end;
  insert into document_stamps(document_id, slot, role, stamped_by, decision, signer_name, signer_title, signature_seed)
    values (doc, 'ogh-judge-3', 'ogh_richter', third_judge, 'zugestimmt', 'QA judge 3', 'OGH-Richter', 1);
  select count(*) into n from document_stamps where document_id=doc;
  if n <> 2 then raise exception 'Expected two judges of same role'; end if;
  insert into document_announcements values (doc) on conflict do nothing;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'First claim failed'; end if;
  insert into document_announcements values (doc) on conflict do nothing;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Duplicate claim accepted'; end if;
  delete from document_announcements where document_id=doc;
end $$;
rollback;
