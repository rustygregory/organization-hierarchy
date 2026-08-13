# Turning on shared comments

Comment mode works with no setup at all — it just stores comments in your own
browser, and the sidebar says so. That's enough to demo the interaction, but it
isn't the point of the feature: nobody else can see what you wrote, and clearing
your browser data deletes it.

To make comments shared, so everyone with the prototype link reads and writes the
same threads, you need a Supabase project. It's free, takes about five minutes,
and the same project can serve every prototype you drop this into.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and sign up.
2. **New project.** Name it something like `prototype-comments`. Pick the region
   closest to you. Set a database password — you won't need it for this, but
   Supabase requires one.
3. Wait for it to finish provisioning (a minute or two).

## 2. Create the table

Open **SQL Editor** in the left sidebar, then select all of
**[schema.sql](./schema.sql)**, paste, and run. Expect "Success. No rows
returned."

Use that file rather than copying the block below: the ```` ```sql ```` fence
here is markdown formatting, and pasting it along with the query fails with
`syntax error at or near "```"`. The block is reproduced only so this document
explains itself.

```sql
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
-- commenting, replying, resolving and deleting your own note.
--
-- Deliberately permissive, and worth being clear-eyed about: anyone with the
-- link can also delete somebody else's comment or post under somebody else's
-- name. There is no login, so there is nothing to check them against. That is
-- the right trade for design review among colleagues and the wrong trade for
-- anything where attribution has to be trustworthy. Don't put customer data or
-- anything confidential in here.
create policy "anon can read"   on public.prototype_comments for select using (true);
create policy "anon can insert" on public.prototype_comments for insert with check (true);
create policy "anon can update" on public.prototype_comments for update using (true);
create policy "anon can delete" on public.prototype_comments for delete using (true);
```

## 3. Point the prototype at it

**Project Settings → API.** You need two values:

- **Project URL** — looks like `https://abcdefghijklm.supabase.co`
- **Project API keys → `anon` / `public`** — a long string starting `eyJ…`

Create a file called `.env.local` in the project root (next to `package.json`)
with those two values:

```
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi…
```

Restart the dev server, and rebuild before deploying — Vite reads env files at
build time, so a deploy made before this file existed is still running on
localStorage.

```
npm run dev      # local
npm run deploy   # live
```

The sidebar tells you which mode you're in: "Shared — everyone with this link
sees these comments" or "Stored in this browser only".

### About the anon key

It ends up in the built JavaScript, readable by anyone who opens devtools. That's
what it's for — it's a public identifier, not a secret, and what actually governs
access is the row-level security policy above.

The key labelled `service_role` is a different matter. That one bypasses RLS
entirely. Never put it in `.env.local`, in the client, or anywhere near a
prototype.

## 4. Reusing the same project for another prototype

Run the `prototype-comments` skill there, or copy `src/comments/` across by hand
and change one line in `store.js`:

```js
export const PROJECT = 'this-prototype-name'   // → the new prototype's name
```

Then mark the commentable area with `data-comment-root="true"` and render
`<CommentLayer context={…} onRestoreContext={…} />`. Same table, same keys, no
new SQL — the `project` column keeps the comments apart.

## Troubleshooting

The comment layer surfaces Supabase errors in the sidebar rather than silently
showing an empty list, so the message is usually the diagnosis:

| Message | Cause |
| --- | --- |
| `syntax error at or near "```"` in the SQL Editor | A markdown code fence got pasted along with the query. Use [schema.sql](./schema.sql), which has none. |
| `relation "prototype_comments" already exists` | The SQL ran before, possibly partway. `drop table public.prototype_comments cascade;` then re-run — but note that deletes any comments already stored. |
| `Supabase 404` | Table name doesn't match, or the SQL didn't run. Check the table exists under **Table Editor**. |
| `Supabase 401` | Wrong or truncated anon key. Copy it again — it's long and easy to clip. |
| `Supabase 403` / empty list with no error | RLS is on but the policies didn't apply. Re-run the `create policy` statements. |
| Still says "Stored in this browser only" | Vite didn't see the env file. It must be named exactly `.env.local`, sit in the project root, use the `VITE_` prefix, and the server has to be restarted. |
