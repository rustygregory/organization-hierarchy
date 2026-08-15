-- Comment storage for prototype review.
--
-- Paste this whole file into the Supabase SQL Editor and run it. Select-all is
-- safe: there are no markdown fences here to confuse the editor, which is the
-- one thing that goes wrong when copying this out of SETUP.md.
--
-- Safe to run more than once. Every statement is written to tolerate the objects
-- already existing, because the realistic failure mode is a partial run: the
-- table gets created, something later fails, and re-running then dies on
-- `relation "prototype_comments" already exists` with no clue about which of the
-- index, the security setting, and the four policies actually made it. Re-running
-- this converges on the right state from any starting point. It never drops the
-- table, so existing comments survive.
--
-- Runs once per Supabase project, not once per prototype. The `project` column
-- keeps each prototype's comments separate, so the next prototype needs no SQL
-- at all.

create table if not exists public.prototype_comments (
  id          uuid primary key default gen_random_uuid(),
  -- Which prototype this comment belongs to. One Supabase project can serve all
  -- of them; without this column, dropping the comment layer into the next
  -- prototype would mix its comments in with this one's.
  project     text        not null,
  author      text        not null,
  body        text        not null,
  -- A reply is a row pointing at its thread root. Threads here are one level
  -- deep, so a second table would buy nothing.
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

-- Who owns a comment, so that only they can delete it.
--
-- There is no login here. Each browser generates a random key on first use, keeps
-- it in localStorage, and sends it as an `x-comment-key` header; this column is
-- *defaulted from that header* rather than accepted from the request body, so the
-- client never sends it and cannot choose what goes in it.
--
-- Added separately from the create table above so this file stays re-runnable
-- against a table made by an earlier version of it.
alter table public.prototype_comments
  add column if not exists author_key text
  default (current_setting('request.headers', true)::json ->> 'x-comment-key');

-- Every read filters by project and sorts by time. This is the only query the
-- app makes, so it's the only index worth having.
create index if not exists prototype_comments_project_created_idx
  on public.prototype_comments (project, created_at);

-- Already idempotent: enabling this twice is not an error.
alter table public.prototype_comments enable row level security;

-- Reads go through a view, not the table.
--
-- Everyone reads every comment — the point of shared comments is that the team
-- sees one conversation. The view exists to keep `author_key` out of the response
-- and expose the answer — is this mine? — instead of the key.
--
-- With deletes open, that column no longer decides anything, so this is a smaller
-- point than it was: `is_mine` is now just a fact about a row, not a permission.
-- Kept because it stays true, it's what makes schema-owner-only.sql a one-file trip
-- back, and there was never a reason to publish the column in the first place.
--
-- The view runs as its owner rather than as the caller (`security_invoker = off`,
-- which is also the default — set explicitly because it's load-bearing here, not
-- incidental). That is what lets it read `author_key` to compute `is_mine` while
-- the grants further down deny that column to every client. Turn security_invoker
-- on and the view breaks: it would be evaluated with the caller's column
-- privileges, and the caller is precisely who must not have them.
--
-- What running as owner gives up is row-level security on the underlying table.
-- Here that costs nothing — the read policy is `using (true)`, so the view exposes
-- exactly the rows a client could already see. It is worth knowing before adding a
-- *restrictive* read policy later, though: this view would not honour it, and the
-- rows would have to be filtered in the view's own where clause instead.
create or replace view public.prototype_comments_view as
select
  id, project, author, body, parent_id, number, anchor, resolved, created_at,
  -- coalesce, so a request arriving with no header reads as "not mine" rather than
  -- as null, which the app would have to special-case.
  coalesce(
    author_key = current_setting('request.headers', true)::json ->> 'x-comment-key',
    false
  ) as is_mine
from public.prototype_comments;

alter view public.prototype_comments_view set (security_invoker = off);
grant select on public.prototype_comments_view to anon, authenticated;

-- What anonymous link-holders may do: read everything, post as themselves, mark
-- any thread resolved, and delete any comment.
--
-- Deleting is open on purpose, having been owner-only for a while. Ownership
-- without a login can only identify a *browser*, and that gap lands on the person
-- it was meant to protect: a comment written from localhost isn't yours on the
-- deployed link, clearing browser data orphans everything you wrote, and anything
-- posted before the rules existed had no owner at all and could only be removed
-- from the SQL Editor. Being unable to tidy up your own notes is a worse day-to-day
-- failure than a colleague deleting feedback they could have left alone.
--
-- So this assumes the link goes to colleagues reviewing a design and that no
-- comment here is a record anyone needs to keep. schema-owner-only.sql is the way
-- back if that changes.
--
-- Dropped before being created because Postgres has no `create policy if not
-- exists`. That includes "anon can delete own" from the owner-only version, which
-- would otherwise stay behind and keep withholding what this grants.
drop policy if exists "anon can read"       on public.prototype_comments;
drop policy if exists "anon can insert"     on public.prototype_comments;
drop policy if exists "anon can update"     on public.prototype_comments;
drop policy if exists "anon can delete"     on public.prototype_comments;
drop policy if exists "anon can insert own" on public.prototype_comments;
drop policy if exists "anon can resolve"    on public.prototype_comments;
drop policy if exists "anon can delete own" on public.prototype_comments;

-- The underlying table still needs a read policy: security_invoker passes the
-- caller's permissions through to it.
create policy "anon can read" on public.prototype_comments
  for select using (true);

-- Only stamped with your own key. Without the equality check a caller could pass
-- `author_key` in the request body and post a comment owned by somebody else — or
-- by nobody, which would make it undeletable.
create policy "anon can insert own" on public.prototype_comments
  for insert with check (
    author_key is not null
    and author_key = current_setting('request.headers', true)::json ->> 'x-comment-key'
  );

-- Resolving is triage rather than authorship: whoever is collecting the feedback
-- needs to mark a thread handled, it is reversible, and it changes nobody's words.
-- The column grant below is what stops this becoming "edit anyone's text".
create policy "anon can resolve" on public.prototype_comments
  for update using (true) with check (true);

-- Any comment, not just your own — see the note above the drops.
create policy "anon can delete" on public.prototype_comments
  for delete using (true);

-- Column-level grants, which are what actually confine an update to `resolved`.
-- Row-level security decides which *rows* a statement may touch and has nothing to
-- say about which columns, so the update policy on its own would allow rewriting
-- anyone's body text.
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
