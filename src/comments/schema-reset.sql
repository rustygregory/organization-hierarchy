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

-- What anonymous link-holders may do. Read, post, and edit — which covers
-- commenting, replying, resolving and deleting a note.
--
-- Deliberately permissive, and worth being clear-eyed about: anyone with the
-- link can also delete somebody else's comment or post under somebody else's
-- name. There is no login, so there is nothing to check them against. That is
-- the right trade for design review among colleagues and the wrong trade for
-- anything where attribution has to be trustworthy. Don't put customer data or
-- anything confidential in here.
--
-- To lock it down instead, delete the update and delete policies: reviewers can
-- then post and read, but not resolve or delete anything.
create policy "anon can read"   on public.prototype_comments for select using (true);
create policy "anon can insert" on public.prototype_comments for insert with check (true);
create policy "anon can update" on public.prototype_comments for update using (true);
create policy "anon can delete" on public.prototype_comments for delete using (true);

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
