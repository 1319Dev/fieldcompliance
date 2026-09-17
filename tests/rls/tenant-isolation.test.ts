import { describe, expect, it } from "vitest";

type Role =
  | "OWNER"
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "INSPECTOR"
  | "FOREMAN"
  | "FIELD_USER"
  | "VIEWER";

type State = {
  platformAdmins: string[];
  members: { organizationId: string; userId: string; role: Role }[];
  organizations: { id: string; name: string }[];
  settings: { organizationId: string; oqExpiringDays: number }[];
  invitations: { organizationId: string; email: string }[];
  profiles: { id: string; email: string }[];
};

const ORG_A = "org-a";
const ORG_B = "org-b";
const USER_A = "user-a";
const USER_B = "user-b";

const state: State = {
  platformAdmins: [],
  members: [
    { organizationId: ORG_A, userId: USER_A, role: "OWNER" },
    { organizationId: ORG_B, userId: USER_B, role: "OWNER" },
  ],
  organizations: [
    { id: ORG_A, name: "Alpha" },
    { id: ORG_B, name: "Bravo" },
  ],
  settings: [
    { organizationId: ORG_A, oqExpiringDays: 30 },
    { organizationId: ORG_B, oqExpiringDays: 30 },
  ],
  invitations: [
    { organizationId: ORG_A, email: "invite-a@example.test" },
    { organizationId: ORG_B, email: "invite-b@example.test" },
  ],
  profiles: [
    { id: USER_A, email: "a@example.test" },
    { id: USER_B, email: "b@example.test" },
  ],
};

function isPlatformAdmin(userId: string) {
  return state.platformAdmins.includes(userId);
}

function isOrgMember(userId: string, organizationId: string) {
  return state.members.some(
    (member) =>
      member.userId === userId && member.organizationId === organizationId,
  );
}

function hasOrgRole(userId: string, organizationId: string, roles: Role[]) {
  return state.members.some(
    (member) =>
      member.userId === userId &&
      member.organizationId === organizationId &&
      roles.includes(member.role),
  );
}

function sharesOrganizationWith(viewerId: string, profileId: string) {
  const viewerOrgs = new Set(
    state.members
      .filter((member) => member.userId === viewerId)
      .map((member) => member.organizationId),
  );
  return state.members.some(
    (member) =>
      member.userId === profileId && viewerOrgs.has(member.organizationId),
  );
}

function selectOrganizations(userId: string) {
  return state.organizations.filter(
    (org) => isPlatformAdmin(userId) || isOrgMember(userId, org.id),
  );
}

function selectMembers(userId: string) {
  return state.members.filter(
    (member) =>
      isPlatformAdmin(userId) || isOrgMember(userId, member.organizationId),
  );
}

function selectSettings(userId: string) {
  return state.settings.filter(
    (row) =>
      isPlatformAdmin(userId) || isOrgMember(userId, row.organizationId),
  );
}

function selectInvitations(userId: string) {
  return state.invitations.filter(
    (row) =>
      isPlatformAdmin(userId) ||
      hasOrgRole(userId, row.organizationId, ["OWNER", "ADMIN"]),
  );
}

function selectProfiles(userId: string) {
  return state.profiles.filter(
    (profile) =>
      profile.id === userId ||
      isPlatformAdmin(userId) ||
      sharesOrganizationWith(userId, profile.id),
  );
}

function canUpdateOrganization(userId: string, organizationId: string) {
  return (
    isPlatformAdmin(userId) ||
    hasOrgRole(userId, organizationId, ["OWNER", "ADMIN"])
  );
}

describe("org A cannot read org B", () => {
  it("hides the other tenant's organization row", () => {
    const visible = selectOrganizations(USER_A).map((org) => org.id);
    expect(visible).toEqual([ORG_A]);
    expect(visible).not.toContain(ORG_B);
  });

  it("hides the other tenant's memberships", () => {
    const visible = selectMembers(USER_A);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.organizationId).toBe(ORG_A);
  });

  it("hides the other tenant's settings including oq_expiring_days", () => {
    const visible = selectSettings(USER_A);
    expect(visible).toEqual([{ organizationId: ORG_A, oqExpiringDays: 30 }]);
  });

  it("hides the other tenant's invitations from an OWNER of org A", () => {
    const visible = selectInvitations(USER_A);
    expect(visible).toEqual([
      { organizationId: ORG_A, email: "invite-a@example.test" },
    ]);
  });

  it("hides the other tenant's profile", () => {
    const visible = selectProfiles(USER_A).map((profile) => profile.id);
    expect(visible).toEqual([USER_A]);
  });

  it("rejects cross-tenant updates", () => {
    expect(canUpdateOrganization(USER_A, ORG_B)).toBe(false);
    expect(canUpdateOrganization(USER_A, ORG_A)).toBe(true);
  });

  it("still hides org B from a non-admin member of org A", () => {
    const inspectorStateMember = {
      organizationId: ORG_A,
      userId: "user-inspector",
      role: "INSPECTOR" as const,
    };
    state.members.push(inspectorStateMember);
    try {
      expect(selectOrganizations("user-inspector").map((org) => org.id)).toEqual([
        ORG_A,
      ]);
      expect(selectInvitations("user-inspector")).toEqual([]);
    } finally {
      state.members.pop();
    }
  });
});
