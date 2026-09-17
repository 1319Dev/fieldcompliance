import { describe, expect, it } from "vitest";
import {
  APP_PATH,
  isAuthEntryPath,
  isProtectedPath,
  isPublicPath,
  LOGIN_PATH,
} from "@/lib/auth/paths";

describe("route guards", () => {
  it("treats /app as protected", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/settings")).toBe(true);
    expect(isPublicPath("/app")).toBe(false);
  });

  it("treats auth pages as public entry points", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath(LOGIN_PATH)).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/forgot-password")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/auth/reset-password")).toBe(true);
    expect(isAuthEntryPath(LOGIN_PATH)).toBe(true);
    expect(isAuthEntryPath(APP_PATH)).toBe(false);
  });
});
