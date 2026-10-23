-- Existing installations: apply after 20261023_document_signatures.sql.
-- Historical documents remain NULL and retain their original generated hand.
begin;
alter table fjd_prod.users add column signature jsonb;
alter table fjd_prod.documents add column signer_signature jsonb;
alter table fjd_prod.document_stamps add column signer_signature jsonb;
commit;
