-- Comment storage for prototype review.
--
-- Paste this whole file into the Supabase SQL Editor and run it. Select-all is
-- safe: there are no markdown fences here to confuse the editor, which is the
-- one thing that goes wrong when copying this out of SETUP.md.
--
-- Runs once per Supabase project, not once per prototype. The `project` column
-- keeps each prototype's comments separate, so the next prototype needs no SQL
-- at all.

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
-- To lock it down instead, drop the last two statements: reviewers can then post
-- and read, but not resolve or delete anything.
create policy "anon can read"   on public.prototype_comments for select using (true);
create policy "anon can insert" on public.prototype_comments for insert with check (true);
create policy "anon can update" on public.prototype_comments for update using (true);
create policy "anon can delete" on public.prototype_comments for delete using (true);
