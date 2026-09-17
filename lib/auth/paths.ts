const AUTH_ENTRY_PREFIXES = ["/login", "/signup", "/forgot-password"] as const;

export function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthCallbackPath(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return isAuthEntryPath(pathname) || isAuthCallbackPath(pathname);
}

export function isProtectedPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export const LOGIN_PATH = "/login";
export const APP_PATH = "/app";
