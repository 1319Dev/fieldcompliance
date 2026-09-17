import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("id, role, organization_id")
    .order("created_at", { ascending: true });

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const orgById = new Map(
    (organizations ?? []).map((organization) => [organization.id, organization]),
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="mt-1 text-sm text-slate-600">
          Phase 1 foundation: your account and organization memberships.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Organizations
        </h2>
        {memberships && memberships.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {memberships.map((membership) => {
              const org = orgById.get(membership.organization_id);
              return (
                <li
                  key={membership.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">{org?.name ?? "Organization"}</p>
                    {org?.slug ? (
                      <p className="text-sm text-slate-500">{org.slug}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {membership.role}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            You are not a member of an organization yet. An owner can invite
            you, or a privileged operator can seed memberships in the database.
          </p>
        )}
      </div>
    </section>
  );
}
