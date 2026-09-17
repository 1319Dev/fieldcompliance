import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "@/components/auth-shell";
import { signUp } from "@/app/auth/actions";
import Link from "next/link";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Create an account"
      subtitle="You’ll confirm your email before accessing the app."
    >
      <AuthMessage error={params.error} />
      <form action={signUp} className="space-y-4">
        <AuthField
          label="Full name"
          name="full_name"
          type="text"
          autoComplete="name"
        />
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
          autoComplete="new-password"
          minLength={8}
        />
        <AuthSubmit>Sign up</AuthSubmit>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="text-amber-400 hover:text-amber-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
