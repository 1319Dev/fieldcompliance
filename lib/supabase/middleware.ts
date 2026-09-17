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

  try {
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
      return redirectWithSession(request, supabaseResponse, LOGIN_PATH, {
        next: request.nextUrl.pathname,
      });
    }

    if (isAuthenticated && isAuthEntryPath(request.nextUrl.pathname)) {
      return redirectWithSession(request, supabaseResponse, APP_PATH);
    }

    return supabaseResponse;
  } catch {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }
}

function redirectWithSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
  query?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  const redirectResponse = NextResponse.redirect(url);
  copyCookies(supabaseResponse, redirectResponse);
  copyCacheHeaders(supabaseResponse, redirectResponse);
  return redirectResponse;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function copyCacheHeaders(from: NextResponse, to: NextResponse) {
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
}
