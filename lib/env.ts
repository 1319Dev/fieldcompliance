/**
 * Public Supabase credentials only. The service_role key must never appear here
 * or in any NEXT_PUBLIC_* variable.
 */

function assertNotServiceRole(key: string, label: string) {
  if (key.includes("service_role") || key.includes("service-role")) {
    throw new Error(
      `${label} looks like a service_role key. Never send the service role to the browser or Next.js public env.`,
    );
  }
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  assertNotServiceRole(key, "Supabase publishable key");
  return key;
}
