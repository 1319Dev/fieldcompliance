import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "@/components/auth-shell";
import { requestPasswordReset } from "@/app/auth/actions";
import Link from "next/link";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Reset password"
      subtitle="We’ll email a link if the account exists."
    >
      <AuthMessage error={params.error} message={params.message} />
      <form action={requestPasswordReset} className="space-y-4">
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
        />
        <AuthSubmit>Send reset link</AuthSubmit>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        <Link href="/login" className="text-amber-400 hover:text-amber-300">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
