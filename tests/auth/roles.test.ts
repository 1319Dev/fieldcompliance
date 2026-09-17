import { describe, expect, it } from "vitest";
import {
  canManageOrganization,
  isOrganizationRole,
  ORGANIZATION_ROLES,
} from "@/lib/auth/roles";

describe("organization roles", () => {
  it("includes the Phase 1 role set", () => {
    expect(ORGANIZATION_ROLES).toEqual([
      "OWNER",
      "ADMIN",
      "PROJECT_MANAGER",
      "INSPECTOR",
      "FOREMAN",
      "FIELD_USER",
      "VIEWER",
    ]);
  });

  it("only owners and admins manage an organization", () => {
    expect(canManageOrganization("OWNER")).toBe(true);
    expect(canManageOrganization("ADMIN")).toBe(true);
    expect(canManageOrganization("INSPECTOR")).toBe(false);
    expect(canManageOrganization("VIEWER")).toBe(false);
    expect(isOrganizationRole("OWNER")).toBe(true);
    expect(isOrganizationRole("SUPERUSER")).toBe(false);
  });
});
