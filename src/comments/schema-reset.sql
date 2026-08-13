-- Start the comments table over from a clean slate.
--
-- For when a `prototype_comments` table exists but isn't the right shape —
-- typically one created through Supabase's Table Editor UI, which starts a new
-- table with only `id` and `created_at`. The symptom is
-- `column "project" does not exist`, or a foreign-key type error, when running
-- schema.sql against it.
--
-- Cannot lose comments. The first statement aborts the whole thing if the table
-- holds even one row, and the SQL Editor runs this as a single transaction, so an
-- abort means the drop below never happens. If you want to wipe a populated table
-- deliberately, delete the guard block — but then you are choosing that.

do $$
begin
  if to_regclass('public.prototype_comments') is not null
     and exists (select 1 from public.prototype_comments limit 1) then
    raise exception
      'Not dropping: prototype_comments has rows in it. Those are real comments.';
  end if;
end $$;

-- `cascade` because the table references itself for replies, and because
-- dropping it takes its policies with it — which is the point: a leftover policy
-- from a half-finished run is exactly the kind of state that makes the next run
-- fail in a confusing way.
drop table if exists public.prototype_comments cascade;

create table public.prototype_comments (
  id          uuid primary key default gen_random_uuid(),
  -- Which prototype this comment belongs to. One Supabase project can serve all
  -- of them; without this column, dropping the comment layer into the next
  -- prototype would mix its comments in with this one's.
  project     text        not null,
  author      text        not null,
  body        text        not null,
  -- A reply is a row pointing at its thread root. Threads here are one level
  -- deep, so a second table would buy nothing.
  --
  -- Note this is why the id has to be uuid rather than the bigint identity column
  -- the Table Editor UI gives you by default: a uuid parent_id can't reference a
  -- bigint id, and the mismatch fails at create time.
  parent_id   uuid        references public.prototype_comments(id) on delete cascade,
  -- Sequential per project, for "#3"-style references in conversation.
  number      integer,
  -- What the pin points at: the app state it was made in, plus a structural path
  -- to the element. Kept as jsonb because the shape is the host prototype's
  -- business, not the table's — a different prototype stores a different context
  -- without a migration.
  anchor      jsonb,
  resolved    boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Every read filters by project and sorts by time. This is the only query the
-- app makes, so it's the only index worth having.
create index prototype_comments_project_created_idx
  on public.prototype_comments (project, created_at);

alter table public.prototype_comments enable row level security;

-- Who owns a comment, so only they can delete it. Defaulted from a request header
-- rather than accepted in the request body, so the client cannot choose it. See
-- schema.sql for the full reasoning.
alter table public.prototype_comments
  add column author_key text
  default (current_setting('request.headers', true)::json ->> 'x-comment-key');

-- Reads go through a view that returns `is_mine` rather than the key itself.
-- Runs as its owner (security_invoker off), which is what lets it read author_key
-- while clients are denied that column.
create view public.prototype_comments_view as
select
  id, project, author, body, parent_id, number, anchor, resolved, created_at,
  coalesce(
    author_key = current_setting('request.headers', true)::json ->> 'x-comment-key',
    false
  ) as is_mine
from public.prototype_comments;

alter view public.prototype_comments_view set (security_invoker = off);
grant select on public.prototype_comments_view to anon, authenticated;

-- What anonymous link-holders may do: read everything, post as themselves, resolve
-- any thread, and delete only their own comments. Not authentication — the author
-- name is still self-declared, and the owner key lives in one browser — so still
-- the wrong place for anything confidential.
create policy "anon can read" on public.prototype_comments
  for select using (true);

create policy "anon can insert own" on public.prototype_comments
  for insert with check (
    author_key is not null
    and author_key = current_setting('request.headers', true)::json ->> 'x-comment-key'
  );

create policy "anon can resolve" on public.prototype_comments
  for update using (true) with check (true);

create policy "anon can delete own" on public.prototype_comments
  for delete using (
    author_key = current_setting('request.headers', true)::json ->> 'x-comment-key'
  );

-- Column grants. These are what confine an update to `resolved` and keep
-- `author_key` out of every client's reach — row-level security governs rows, not
-- columns, so the policies above are not sufficient on their own.
revoke update on public.prototype_comments from anon, authenticated;
grant update (resolved) on public.prototype_comments to anon, authenticated;

revoke insert on public.prototype_comments from anon, authenticated;
grant insert (project, author, body, parent_id, number, anchor, resolved)
  on public.prototype_comments to anon, authenticated;

revoke select on public.prototype_comments from anon, authenticated;
grant select (id, project, author, body, parent_id, number, anchor, resolved, created_at)
  on public.prototype_comments to anon, authenticated;

-- Proof it worked, rather than a bare "Success. No rows returned." Expect nine
-- column rows followed by four policy rows.
select 'column' as kind, column_name as name, data_type as detail
from information_schema.columns
where table_schema = 'public' and table_name = 'prototype_comments'
union all
select 'policy' as kind, policyname as name, cmd as detail
from pg_policies
where schemaname = 'public' and tablename = 'prototype_comments'
order by kind desc, name;
