import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260917183037_tenancy_and_rls.sql",
  ),
  "utf8",
);

const PUBLIC_TABLES = [
  "profiles",
  "organizations",
  "organization_members",
  "invitations",
  "platform_admins",
  "organization_settings",
] as const;

const ROLES = [
  "OWNER",
  "ADMIN",
  "PROJECT_MANAGER",
  "INSPECTOR",
  "FOREMAN",
  "FIELD_USER",
  "VIEWER",
] as const;

describe("tenancy migration RLS contract", () => {
  it("defines every Phase 1 public table", () => {
    for (const table of PUBLIC_TABLES) {
      expect(MIGRATION).toMatch(
        new RegExp(`create table if not exists public\\.${table}\\b`, "i"),
      );
    }
  });

  it("ties profiles.id to auth.users.id", () => {
    expect(MIGRATION).toMatch(
      /create table if not exists public\.profiles \([\s\S]*?id uuid primary key references auth\.users \(id\)/i,
    );
  });

  it("defines all organization roles", () => {
    for (const role of ROLES) {
      expect(MIGRATION).toContain(`'${role}'`);
    }
  });

  it("defaults oq_expiring_days to 30", () => {
    expect(MIGRATION).toMatch(
      /oq_expiring_days integer not null default 30/i,
    );
  });

  it("never disables RLS", () => {
    expect(MIGRATION.toLowerCase()).not.toContain("disable row level security");
    expect(MIGRATION.toLowerCase()).not.toContain("disable row level security;");
  });

  it("enables and forces RLS on every public table", () => {
    for (const table of PUBLIC_TABLES) {
      expect(MIGRATION).toMatch(
        new RegExp(
          `alter table public\\.${table} enable row level security;`,
          "i",
        ),
      );
      expect(MIGRATION).toMatch(
        new RegExp(
          `alter table public\\.${table} force row level security;`,
          "i",
        ),
      );
    }
  });

  it("creates select policies that isolate tenants via membership", () => {
    expect(MIGRATION).toContain("create policy organizations_select");
    expect(MIGRATION).toContain("create policy organization_members_select");
    expect(MIGRATION).toContain("create policy organization_settings_select");
    expect(MIGRATION).toContain("create policy invitations_select");
    expect(MIGRATION).toMatch(/private\.is_org_member\(/);
    expect(MIGRATION).toMatch(
      /from public\.organization_members m[\s\S]*m\.user_id = \(select auth\.uid\(\)\)/,
    );
  });

  it("keeps security-definer helpers in the private schema", () => {
    expect(MIGRATION).toContain("create schema if not exists private");
    expect(MIGRATION).toContain("create or replace function private.is_org_member");
    expect(MIGRATION).toContain("create or replace function private.is_platform_admin");
    expect(MIGRATION).toMatch(/security definer/);
    expect(MIGRATION).toMatch(/set search_path = ''/);
  });
});
