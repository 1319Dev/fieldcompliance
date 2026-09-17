import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "@/components/auth-shell";
import { signIn } from "@/app/auth/actions";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Sign in" subtitle="Use your work email to continue.">
      <AuthMessage error={params.error} message={params.message} />
      <form action={signIn} className="space-y-4">
        {params.next ? (
          <input type="hidden" name="next" value={params.next} />
        ) : null}
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
        />
        <AuthSubmit>Sign in</AuthSubmit>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm text-slate-400">
        <p>
          <Link href="/forgot-password" className="text-amber-400 hover:text-amber-300">
            Forgot password?
          </Link>
        </p>
        <p>
          Need an account?{" "}
          <Link href="/signup" className="text-amber-400 hover:text-amber-300">
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
