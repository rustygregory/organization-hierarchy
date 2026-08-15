-- Let anyone with the link delete any comment.
--
-- Run this in the Supabase SQL Editor. It reverses schema-owner-only.sql, which
-- confined deletes to the browser that wrote each comment. A fresh schema.sql
-- already includes what's here, so this file is only for changing an existing
-- project over.
--
-- Safe to run more than once, and it never drops the table, so existing comments
-- survive.
--
-- Why go back. Ownership without a login can only identify a *browser*, not a
-- person, and that gap is felt by the person it was meant to protect: comments
-- written before the rules existed have no owner at all, comments written from
-- localhost aren't yours on the deployed link, and clearing browser data orphans
-- everything you wrote. The result is being unable to tidy up your own notes,
-- which is a worse day-to-day failure than the thing being prevented — a
-- colleague deleting feedback they could simply have left alone.
--
-- What this assumes. The link goes to colleagues reviewing a design, comments are
-- design feedback, and nothing here is a record anyone needs to keep. If that
-- stops being true, schema-owner-only.sql is the way back.

-- 1. The delete policy: any row, not just your own.
--
-- Dropped by both names because Postgres has no `create policy if not exists` and
-- the owner-only version may be the one currently installed.
drop policy if exists "anon can delete"     on public.prototype_comments;
drop policy if exists "anon can delete own" on public.prototype_comments;

create policy "anon can delete" on public.prototype_comments
  for delete using (true);

-- 2. What deliberately does not change.
--
-- `author_key` stays on the table and stays unreadable by clients, and reads keep
-- going through the view that computes `is_mine`. None of it gates deleting any
-- more, so this is now just a record of which browser wrote a row — but leaving it
-- in place costs nothing, keeps schema-owner-only.sql a one-file trip back, and
-- avoids publishing a column there was never a reason to publish.
--
-- Inserts still require a matching key, so every new row gets an owner. That is
-- what keeps the return trip meaningful: turn owner-only back on and rows written
-- in the meantime are still attributable, rather than a second batch nobody owns.
--
-- Updates are still confined to `resolved` by column grant. Deleting a comment and
-- rewriting someone's words are different acts: one removes a note the writer can
-- see is gone, the other leaves their name on text they didn't write.

-- Proof it worked, rather than a bare "Success. No rows returned." Expect delete to
-- read `true` under `using`, and the insert policy to still name author_key.
select
  policyname,
  cmd,
  coalesce(qual, 'n/a')       as using_clause,
  coalesce(with_check, 'n/a') as check_clause
from pg_policies
where schemaname = 'public' and tablename = 'prototype_comments'
order by cmd, policyname;
