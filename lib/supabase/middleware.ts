import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  APP_PATH,
  isAuthEntryPath,
  isProtectedPath,
  LOGIN_PATH,
} from "@/lib/auth/paths";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Session middleware used by Next.js 16 `proxy.ts`.
 * Refreshes the Auth token, then enforces protected `/app` routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  if (!isAuthenticated && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.setAll(supabaseResponse.cookies.getAll());
    copyCacheHeaders(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (isAuthenticated && isAuthEntryPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = APP_PATH;
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.setAll(supabaseResponse.cookies.getAll());
    copyCacheHeaders(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

function copyCacheHeaders(from: NextResponse, to: NextResponse) {
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
}
