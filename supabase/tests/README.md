# Tenant isolation tests

## Always-on (CI)

`pnpm test` parses the committed migrations and evaluates the same membership
rules the policies implement. These tests do **not** need Docker.

## Live Postgres harness (optional)

When Supabase local (or another Postgres with `auth` schema) is available:

```bash
npx supabase start
npx supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/tenant_isolation.sql
```

The script impersonates an `authenticated` user in org A and asserts they cannot
`SELECT`/`UPDATE` org B rows. It rolls back so it leaves no data behind.

Do not apply this against production.
