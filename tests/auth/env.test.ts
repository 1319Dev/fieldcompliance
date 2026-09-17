import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("public supabase env guards", () => {
  it("rejects a service_role key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "eyJ-service_role-should-never-be-here";
    expect(() => getSupabasePublishableKey()).toThrow(/service_role/i);
  });

  it("accepts a publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
    expect(getSupabasePublishableKey()).toBe("sb_publishable_example");
  });

  it("falls back to the anon key alias", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-example";
    expect(getSupabasePublishableKey()).toBe("anon-example");
  });

  it("requires a project URL", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getSupabaseUrl()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
