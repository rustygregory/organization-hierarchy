-- Is the comments table actually ready? Read-only — changes nothing.
--
-- Exists because the failure that matters is silent. A table with the right name
-- but a missing policy accepts the app's connection and then drops every comment
-- on the floor with no error a reviewer would ever see. Better to assert the
-- shape now than to discover it when a PM's feedback vanishes.
--
-- Every row should read PASS. Anything else names what to fix.

with expected(name, kind) as (
  values
    ('id', 'uuid'), ('project', 'text'), ('author', 'text'), ('body', 'text'),
    ('parent_id', 'uuid'), ('number', 'integer'), ('anchor', 'jsonb'),
    ('resolved', 'boolean'), ('created_at', 'timestamp with time zone'),
    -- Who owns a row, so only they can delete it. Missing means the table predates
    -- the owner-only rules: run schema-owner-only.sql.
    ('author_key', 'text')
),
actual as (
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'prototype_comments'
),
column_checks as (
  select
    'column ' || expected.name as check_name,
    case
      when actual.column_name is null then 'FAIL — missing'
      when actual.data_type <> expected.kind
        then 'FAIL — is ' || actual.data_type || ', must be ' || expected.kind
      else 'PASS — ' || expected.kind
    end as result
  from expected
  left join actual on actual.column_name = expected.name
),
policy_checks as (
  select
    'policy ' || lower(cmds.cmd) as check_name,
    case
      when count(pg_policies.policyname) = 0 then 'FAIL — no policy grants ' || cmds.cmd
      else 'PASS — ' || string_agg(pg_policies.policyname, ', ')
    end as result
  from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as cmds(cmd)
  left join pg_policies
    on pg_policies.schemaname = 'public'
   and pg_policies.tablename = 'prototype_comments'
   and pg_policies.cmd = cmds.cmd
  group by cmds.cmd
),
other_checks as (
  select 'table exists' as check_name,
    case when to_regclass('public.prototype_comments') is null
      then 'FAIL — run schema.sql' else 'PASS' end as result
  union all
  -- Without RLS enabled the policies above are inert and the table is wide open.
  select 'row level security',
    case when exists (
      select 1 from pg_class
      where oid = 'public.prototype_comments'::regclass and relrowsecurity
    ) then 'PASS — enabled' else 'FAIL — not enabled' end
  union all
  select 'index on (project, created_at)',
    case when exists (
      select 1 from pg_indexes
      where schemaname = 'public' and tablename = 'prototype_comments'
        and indexdef like '%project%created_at%'
    ) then 'PASS' else 'WARN — missing, but it only affects speed' end
  union all
  -- The app reads through this view, not the table: it computes `is_mine` and keeps
  -- `author_key` out of the response. The key no longer grants anything now that
  -- deletes are open, but the app still expects the view to exist.
  select 'reading view exists',
    case when to_regclass('public.prototype_comments_view') is null
      then 'FAIL — run schema-owner-only.sql' else 'PASS' end
  union all
  -- The view must run as its owner, which is what lets it read `author_key` to
  -- answer "is this mine?" while clients are denied that column. With
  -- security_invoker on it would be evaluated with the caller's privileges and
  -- every read would fail with a permission error on author_key.
  select 'view can compute is_mine',
    case
      when to_regclass('public.prototype_comments_view') is null then 'FAIL — no view'
      when exists (
        select 1 from pg_class
        where oid = 'public.prototype_comments_view'::regclass
          and reloptions::text like '%security_invoker=on%'
      ) then 'FAIL — security_invoker on; reads will fail on author_key'
      else 'PASS — runs as owner'
    end
  union all
  -- The check that matters most. Reading through the view protects nothing on its
  -- own: the table stays in the API, so if `author_key` is selectable, anyone can
  -- ask for it directly, collect every reviewer's key, and delete anything.
  select 'owner key not readable',
    case when exists (
      select 1 from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'prototype_comments'
        and column_name = 'author_key' and privilege_type = 'SELECT'
        and grantee in ('anon', 'authenticated')
    ) then 'FAIL — author_key is selectable; re-run the grant statements'
    else 'PASS — hidden from clients' end
  union all
  -- Row-level security says which rows may be touched, not which columns. Without
  -- this grant narrowed to `resolved`, the update policy would allow rewriting
  -- anyone's text.
  select 'update limited to resolved',
    coalesce((
      select case
        when string_agg(distinct column_name, ',') = 'resolved' then 'PASS'
        else 'FAIL — also grants ' || string_agg(distinct column_name, ', ')
      end
      from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'prototype_comments'
        and privilege_type = 'UPDATE' and grantee = 'anon'
    ), 'PASS — no update granted at all')
  union all
  -- Whether deletes are open or owner-only. Both are valid configurations, so this
  -- reports rather than judges: `using (true)` means anyone with the link can remove
  -- any comment, which is what schema.sql now ships.
  select 'who can delete',
    coalesce((
      select case
        when qual = 'true' then 'OPEN — anyone with the link can delete any comment'
        else 'OWNER-ONLY — ' || qual
      end
      from pg_policies
      where schemaname = 'public' and tablename = 'prototype_comments' and cmd = 'DELETE'
      limit 1
    ), 'FAIL — no delete policy at all; nobody can delete anything')
  union all
  -- Reached through to_jsonb rather than naming the column, because a bare
  -- `where author_key is null` fails to *parse* on a table that hasn't been
  -- upgraded yet — and that would take the whole diagnostic down with it, on
  -- exactly the table most in need of diagnosing.
  --
  -- Ownerless rows no longer block anything while deletes are open. Still reported,
  -- because they'd become undeletable again the moment owner-only was restored.
  select 'comments with no owner',
    case when count(*) = 0 then 'PASS — none'
      else count(*)::text || ' have no owner; harmless now, undeletable if owner-only returns' end
  from public.prototype_comments t
  where to_jsonb(t) ->> 'author_key' is null
  union all
  select 'comments stored so far', count(*)::text
  from public.prototype_comments
)
select * from other_checks
union all select * from column_checks
union all select * from policy_checks
order by check_name;
