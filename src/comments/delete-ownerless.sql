-- Delete the comments that nobody owns.
--
-- **Probably not the file you want.** With deletes open — schema.sql's default —
-- every comment can be removed from the app's own UI, ownerless or not, so this is
-- only needed on a project still running the owner-only rules from
-- schema-owner-only.sql. If Delete is missing from comments you wrote, the fix is
-- schema-open-delete.sql, not this.
--
-- Under owner-only rules, rows written before those rules existed have no
-- `author_key`, so the delete-your-own policy matches nobody and the app's Delete
-- button can't touch them. The SQL Editor runs as the table owner and is not bound
-- by that policy, which is why this has to happen here.
--
-- Paste this whole file into the Supabase SQL Editor and run it. Select-all is
-- safe: there are no markdown fences to confuse the editor.
--
-- Only ever affects ownerless rows. Anything posted after the upgrade has an
-- author_key and is left alone, so this cannot take out comments people are still
-- relying on being able to manage themselves.

-- First, see what will go. Read-only — run the file once and read this output
-- before deciding, if you want the confirmation.
select
  number,
  author,
  left(body, 60) as body,
  created_at,
  case when parent_id is null then 'thread' else 'reply' end as kind
from public.prototype_comments
where author_key is null
order by created_at;

-- Then the delete itself.
--
-- Replies to an ownerless thread go too, via the parent_id foreign key's
-- `on delete cascade` — a reply can't outlive the comment it answers.
delete from public.prototype_comments
where author_key is null;

-- What's left. Everything here has an owner, so each of these can be deleted from
-- the prototype's own UI by whoever wrote it.
select
  count(*) as comments_remaining,
  count(*) filter (where author_key is null) as still_ownerless
from public.prototype_comments;
