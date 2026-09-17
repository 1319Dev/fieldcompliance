import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-950 text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-400">
          FIELD COMPLIANCE
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Create account
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-400">
          Phase 1 foundation
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Multi-tenant field compliance, isolated at the database.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Sign in to reach the protected workspace. Organization data is scoped
          by membership and Row Level Security — tenants cannot read each
          other.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:border-slate-500"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
