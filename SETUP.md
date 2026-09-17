# Setup

Phase 1 local development and CI notes. Do not apply remote migrations unless
you have credentials for the dedicated Field Compliance development project.

## Prerequisites

- Node.js 22+
- pnpm 10+
- A Supabase project (hosted or local via the Supabase CLI)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Environment variables

Copy the tracked template and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL from the Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes* | Publishable / anon key. Never the service role key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Fallback if the publishable key is unset |
| `NEXT_PUBLIC_SITE_URL` | yes for auth emails | e.g. `http://localhost:3000` |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Server-only test/admin use. Never `NEXT_PUBLIC_*` |
| `DATABASE_URL` | no | Direct Postgres URL for the SQL isolation harness |

\* Provide either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

`.env`, `.env.local`, and other secret files are gitignored. `.env.example` is tracked.

## 3. Database migrations

SQL lives in `supabase/migrations/`. Apply locally:

```bash
npx supabase start
npx supabase db reset
```

Do **not** run `supabase db push` against a hosted project unless Field Compliance
dev credentials are available and you intend to apply Phase 1 schema there.

## 4. Auth URL configuration

In the Supabase dashboard (Authentication → URL Configuration):

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/reset-password`

## 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visitors are
sent to `/login`. Authenticated users land on `/app`.

## 6. Tests and CI

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Tenant isolation is asserted two ways:

1. **Always-on unit tests** parse the committed migrations and fail if any public
   table is missing RLS, if policies are absent, or if client code references the
   service role key.
2. **Optional SQL harness** (`supabase/tests/tenant_isolation.sql`) proves org A
   cannot read org B when a local/CI Postgres instance is available.

## Rollback

- Application: revert the feature branch / restore the previous deploy.
- Database: do not `DROP` production data blindly. Roll forward with a new
  migration, or restore from a Supabase backup if a migration was applied
  remotely in error.
