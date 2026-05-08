-- Step 3 prep: change plans.id from uuid to text so the existing client-side
-- ID format (e.g. "1778276739562-gegg7p4kk" from generateId()) can be
-- preserved when migrating plans out of localStorage. The client always
-- provides an id at insert time, so we drop the default too.
--
-- Safe to run because the table is currently empty.

alter table public.plans alter column id drop default;
alter table public.plans alter column id type text using id::text;
