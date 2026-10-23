-- Optional title of an official (Dr., Prof., ...). Printed before the name under the signature of a
-- document, never inside the handwritten signature. The document keeps the title it was issued with.
-- Applied to both environments; each login role keeps access to its own schema only.

alter table fjd_prod.users add column honorific text check (honorific is null or char_length(honorific) <= 20);
alter table fjd_staging.users add column honorific text check (honorific is null or char_length(honorific) <= 20);

alter table fjd_prod.documents add column signer_honorific text check (signer_honorific is null or char_length(signer_honorific) <= 20);
alter table fjd_staging.documents add column signer_honorific text check (signer_honorific is null or char_length(signer_honorific) <= 20);
