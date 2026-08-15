-- Restrict deletes to the person who wrote the comment.
--
-- **Not the default, and not what schema.sql ships.** Deletes are open there —
-- anyone with the link can remove any comment — because ownership without a login
-- can only identify a browser, and that gap kept taking Delete away from the person
-- who wrote the note: a comment posted from localhost isn't yours on the deployed
-- link, a cleared cache orphans everything, and rows predating the rules have no
-- owner at all. See the comment at the top of schema-open-delete.sql.
--
-- Run this only if you want that trade anyway — a link going somewhere less trusted
-- than a design review among colleagues, where one reviewer wiping another's
-- feedback is the risk worth taking the friction for. Everything here is also safe
-- to run on a project that has never had the ownership rules.
--
-- Note what it does to existing comments: anything already stored without an
-- `author_key` becomes undeletable from the UI, and clearing it needs
-- delete-ownerless.sql. schema-open-delete.sql is the way back.
--
-- Safe to run more than once, and it never drops the table, so existing comments
-- survive. Comments written before this ran have no owner recorded and so can no
-- longer be deleted from the UI by anybody — see the last section for how to
-- clear those out if you have any.
--
-- How ownership works without a login. Each browser generates a random key on
-- first use, keeps it in localStorage, and sends it as an `x-comment-key` header.
-- The database stamps that key onto every row it inserts and requires it to match
-- on delete. Nobody types a password and nobody has an account, but a link holder
-- can still only remove their own notes.
--
-- What this does *not* do. The key lives in one browser, so the same person on a
-- laptop and a phone is two owners, and clearing browser data means giving up the
-- ability to delete what you already wrote. The author name is still self-declared
-- and unverified: anyone can sign a comment "Rusty". This raises the floor from
-- "anyone can delete anything" to "you manage your own notes" — it is not
-- authentication, and it is still the wrong place for confidential material.

-- 1. Where the owner's key is recorded.
--
-- Defaulted from the request header rather than accepted from the request body,
-- so the client never sends this column and cannot choose what goes in it. On an
-- existing table the default fills existing rows with NULL, which is what makes
-- pre-upgrade comments ownerless.
alter table public.prototype_comments
  add column if not exists author_key text
  default (current_setting('request.headers', true)::json ->> 'x-comment-key');

-- 2. Reading.
--
-- Everyone reads every comment — the point of shared comments is that the team
-- sees one conversation. What must not leak is `author_key` itself: published in
-- a readable column, it would tell any reader exactly what to send in order to
-- delete somebody else's note, which is the whole thing this file is preventing.
--
-- So reads go through a view that exposes the *answer* (is this mine?) instead of
-- the key.
--
-- The view runs as its owner rather than as the caller (`security_invoker = off`,
-- which is also the default — set explicitly because it's load-bearing here). That
-- is what lets it read `author_key` to compute `is_mine` while the grants at the
-- end deny that column to every client. Turn security_invoker on and the view
-- breaks: it would be evaluated with the caller's column privileges, and the caller
-- is exactly who must not have them.
--
-- What running as owner gives up is row-level security on the underlying table,
-- which costs nothing while the read policy is `using (true)` — the view exposes
-- exactly the rows a client could already see. Worth knowing before adding a
-- restrictive read policy later: this view wouldn't honour it.
create or replace view public.prototype_comments_view as
select
  id, project, author, body, parent_id, number, anchor, resolved, created_at,
  -- coalesce, so a request arriving with no header reads as "not mine" rather
  -- than as null, which the app would have to special-case.
  coalesce(
    author_key = current_setting('request.headers', true)::json ->> 'x-comment-key',
    false
  ) as is_mine
from public.prototype_comments;

alter view public.prototype_comments_view set (security_invoker = off);
grant select on public.prototype_comments_view to anon, authenticated;

-- 3. The policies.
--
-- Dropped before being created because Postgres has no `create policy if not
-- exists`, and that includes the permissive ones from the older schema — leaving
-- "anon can delete" in place would keep granting exactly what this file removes.
drop policy if exists "anon can read"       on public.prototype_comments;
drop policy if exists "anon can insert"     on public.prototype_comments;
drop policy if exists "anon can update"     on public.prototype_comments;
drop policy if exists "anon can delete"     on public.prototype_comments;
drop policy if exists "anon can insert own" on public.prototype_comments;
drop policy if exists "anon can resolve"    on public.prototype_comments;
drop policy if exists "anon can delete own" on public.prototype_comments;

-- Read: everything. The view is the only thing the app selects from, but the
-- underlying table needs the policy because security_invoker passes the caller's
-- permissions through to it.
create policy "anon can read" on public.prototype_comments
  for select using (true);

-- Insert: only stamped with your own key. Without the equality check a caller
-- could pass `author_key` in the request body and post a comment owned by
-- somebody else — or by nobody, which would make it undeletable.
create policy "anon can insert own" on public.prototype_comments
  for insert with check (
    author_key is not null
    and author_key = current_setting('request.headers', true)::json ->> 'x-comment-key'
  );

-- Update: anyone, but see the column grant below — the only column anyone can
-- write is `resolved`. Resolving is triage rather than authorship: the person
-- collecting the feedback needs to mark a thread handled, it is reversible, and
-- it changes nobody's words. Editing someone else's text is the part that would
-- put words in their mouth, and no policy here permits it.
create policy "anon can resolve" on public.prototype_comments
  for update using (true) with check (true);

-- Delete: your own only.
create policy "anon can delete own" on public.prototype_comments
  for delete using (
    author_key = current_setting('request.headers', true)::json ->> 'x-comment-key'
  );

-- 4. Column-level grants, which are what actually confine an update to
-- `resolved`. Row-level security decides *which rows* a statement may touch and
-- has nothing to say about which columns, so the policy above on its own would
-- allow rewriting anyone's body text.
revoke update on public.prototype_comments from anon, authenticated;
grant update (resolved) on public.prototype_comments to anon, authenticated;

-- Likewise for insert: `author_key` is left out of the grant, so it can only ever
-- be filled by its header default. A column omitted from an insert still gets its
-- default, and the policy above sees the defaulted value — so this closes the door
-- on posting a comment owned by someone else without closing it on posting at all.
revoke insert on public.prototype_comments from anon, authenticated;
grant insert (project, author, body, parent_id, number, anchor, resolved)
  on public.prototype_comments to anon, authenticated;

-- And for select, which is the one that matters most.
--
-- Routing the app's reads through the view is not by itself protection: the table
-- is still in the API, so without this grant anyone could ask it for
-- `?select=author_key` and collect every reviewer's key — and with those, delete
-- anything. Naming the columns leaves `author_key` readable only by the policies
-- that compare it, never by a client.
revoke select on public.prototype_comments from anon, authenticated;
grant select (id, project, author, body, parent_id, number, anchor, resolved, created_at)
  on public.prototype_comments to anon, authenticated;

-- 5. Ownerless comments, if you have any.
--
-- Rows written before this upgrade have no `author_key`, so nobody can delete them
-- from the UI. To clear them out, run delete-ownerless.sql — it lists them first,
-- then deletes only the rows with no owner. The SQL Editor runs as the table owner
-- and is not bound by the policies above, which is why it can.

-- Proof it worked, rather than a bare "Success. No rows returned." Expect the
-- author_key column, the four policies named above, and update limited to
-- `resolved`.
select 'column' as kind, column_name as name, data_type as detail
from information_schema.columns
where table_schema = 'public' and table_name = 'prototype_comments'
  and column_name = 'author_key'
union all
select 'policy', policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'prototype_comments'
union all
select 'update grant', grantee, string_agg(column_name, ', ')
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'prototype_comments'
  and privilege_type = 'UPDATE' and grantee in ('anon', 'authenticated')
group by grantee
order by kind, name;
