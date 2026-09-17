# Field Compliance

Multi-tenant field compliance platform. Phase 1 covers the Next.js application
scaffold, Supabase tenancy schema with Row Level Security (RLS), and authentication.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- pnpm
- Supabase (Auth, Postgres, RLS)

## Quick start

See [SETUP.md](./SETUP.md) for full local setup, environment variables, and auth
redirect configuration.

```bash
pnpm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm dev
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm test` | Unit / policy tests |
| `pnpm build` | Production build |

## Phase 1 scope

- Sign-up, sign-in, sign-out, forgot/reset password
- Session refresh via Next.js proxy (`proxy.ts`, Next.js 16 session middleware)
- Protected `/app` routes
- Tenancy tables with RLS isolation by organization membership
- Tenant-isolation tests and CI (lint, typecheck, test, build)

Phase 2+ product features are intentionally out of scope.
