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
**[schema.sql](./schema.sql)**, paste, and run. It ends with a summary of what it
created rather than a bare "Success. No rows returned."

Use that file rather than copying the block below: the ```` ```sql ```` fence
here is markdown formatting, and pasting it along with the query fails with
`syntax error at or near "```"`. The block is an abridged illustration only — it
leaves out the ownership pieces, so don't run it.

> **Already have a table from an earlier version of this?** If its deletes are
> owner-only — Delete missing from comments you know you wrote — run
> **[schema-open-delete.sql](./schema-open-delete.sql)**, which opens them again
> without dropping the table. Going the other way is
> **[schema-owner-only.sql](./schema-owner-only.sql)**. Either is safe to re-run and
> neither touches existing comments.

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

-- Abridged. The real file also adds an `author_key` column, a reading view, the
-- delete and resolve policies, and the column grants that stop anyone rewriting
-- someone else's text — see "Who can delete what".
create policy "anon can read"   on public.prototype_comments for select using (true);
create policy "anon can insert" on public.prototype_comments for insert with check (true);
```

## Who can delete what

Everyone with the link reads every comment, posts, replies, resolves — and **can
delete any comment**, not just their own. What nobody can do is edit someone else's
words: updates are confined to the `resolved` column by a column grant, so a thread
can be marked handled but not rewritten.

**This was owner-only for a while, and it's worth knowing why it isn't.** Each
browser still generates a random key, and the database still stamps it onto every
row it inserts — that part is unchanged. What changed is that the key no longer gates
deleting, because identifying a *browser* is not identifying a *person*:

- A comment written on `localhost:5173` isn't yours on the deployed link — different
  origin, different localStorage, different key.
- Clearing browser data orphans everything you've already written.
- Your laptop and your phone are two different owners.
- Anything posted before the rules existed had no owner at all and could only be
  removed from the SQL Editor.

Each of those takes Delete away from the person who wrote the note, which in a
design-review thread is a worse failure than the one being prevented — a colleague
deleting feedback they could just as easily have left alone. So the rule is now
"anyone can tidy up", which is roughly how a whiteboard works.

`author_key` stays on the table and stays unreadable by clients, and reads still go
through the view that computes `is_mine`. It's a record of who wrote a row rather
than a permission now, kept because it's true and because it makes the trip back a
single file: run **[schema-owner-only.sql](./schema-owner-only.sql)** to restore
owner-only deletes, or **[schema-open-delete.sql](./schema-open-delete.sql)** to open
them again on a project that has the older rules.

Still not authentication — the name beside a comment is self-declared, so anyone can
sign one with your name. Right for design review among colleagues; the wrong place
for customer data or anything confidential.

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
| Delete missing on any comment | The project still has the owner-only rules. Run [schema-open-delete.sql](./schema-open-delete.sql). |
| Delete appears but fails with a `403` | Same cause from the other side: the app was updated but the SQL wasn't. Run [schema-open-delete.sql](./schema-open-delete.sql). |
| `That comment is already gone` | Someone deleted it first — the delete matched no rows. Reload to catch up. |
| Still says "Stored in this browser only" | Vite didn't see the env file. It must be named exactly `.env.local`, sit in the project root, use the `VITE_` prefix, and the server has to be restarted. |
