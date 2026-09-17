import Link from "next/link";

import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-slate-950 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-amber-400">
            FIELD COMPLIANCE
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthMessage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (error) {
    return (
      <p className="mb-4 rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-200">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="mb-4 rounded-lg border border-emerald-900 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">
        {message}
      </p>
    );
  }
  return null;
}

export function AuthField({
  label,
  name,
  type,
  autoComplete,
  required = true,
  minLength,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-amber-400/40 placeholder:text-slate-500 focus:border-amber-400 focus:ring-2"
      />
    </label>
  );
}

export function AuthSubmit({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="mt-2 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
    >
      {children}
    </button>
  );
}
