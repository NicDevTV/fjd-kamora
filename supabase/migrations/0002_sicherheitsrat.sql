-- The higher order is called Sicherheitsrat from now on (the server leadership in character).
-- Renames the role value in both environments and tightens the allowed values accordingly.

update fjd_prod.roles set role = 'sicherheitsrat' where role = 'foederationsrat';
update fjd_staging.roles set role = 'sicherheitsrat' where role = 'foederationsrat';

alter table fjd_prod.roles drop constraint roles_role_check;
alter table fjd_prod.roles add constraint roles_role_check check (role in ('justizminister', 'sicherheitsrat'));
alter table fjd_staging.roles drop constraint roles_role_check;
alter table fjd_staging.roles add constraint roles_role_check check (role in ('justizminister', 'sicherheitsrat'));
