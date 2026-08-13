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
    ('resolved', 'boolean'), ('created_at', 'timestamp with time zone')
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
  select 'comments stored so far', count(*)::text
  from public.prototype_comments
)
select * from other_checks
union all select * from column_checks
union all select * from policy_checks
order by check_name;
