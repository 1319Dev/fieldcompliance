export const ORGANIZATION_ROLES = [
  "OWNER",
  "ADMIN",
  "PROJECT_MANAGER",
  "INSPECTOR",
  "FOREMAN",
  "FIELD_USER",
  "VIEWER",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const ORG_ADMIN_ROLES: OrganizationRole[] = ["OWNER", "ADMIN"];

export function isOrganizationRole(value: string): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}

export function canManageOrganization(role: OrganizationRole): boolean {
  return ORG_ADMIN_ROLES.includes(role);
}
