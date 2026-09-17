import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "@/components/auth-shell";
import { updatePassword } from "@/app/auth/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="This page is valid after you open the reset link from your email."
    >
      <AuthMessage error={params.error} />
      <form action={updatePassword} className="space-y-4">
        <AuthField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <AuthSubmit>Update password</AuthSubmit>
      </form>
    </AuthShell>
  );
}
