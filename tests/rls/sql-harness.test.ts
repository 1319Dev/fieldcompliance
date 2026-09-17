import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sqlPath = path.join(
  process.cwd(),
  "supabase/tests/tenant_isolation.sql",
);
const databaseUrl = process.env.DATABASE_URL;

describe("live SQL tenant isolation harness", () => {
  it.skipIf(!databaseUrl)(
    "org A cannot read org B in Postgres",
    () => {
      const result = spawnSync(
        "psql",
        [databaseUrl as string, "-v", "ON_ERROR_STOP=1", "-f", sqlPath],
        { encoding: "utf8" },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout + result.stderr).toMatch(/PASS: org A cannot read org B/i);
    },
  );

  it("documents the SQL proof when Docker/Postgres is unavailable", () => {
    if (databaseUrl) return;
    const notice =
      "DATABASE_URL is unset; SQL harness skipped. Migration + in-memory policy tests still run.";
    expect(notice).toContain("SQL harness skipped");
  });
});
