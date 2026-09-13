import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Runs before every page request (Next.js 16 renamed `middleware` to `proxy`).
 *
 * Two jobs:
 *  1. Refresh the Supabase access token and write the rotated cookies onto the
 *     response, so Server Components always see a live session.
 *  2. Bounce signed-out visitors to /login and signed-in ones away from it.
 *
 * Auth is re-checked inside every page and Server Action as well — a proxy
 * matcher is a routing convenience, not a security boundary.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not put anything between the client creation and this call: it is what
  // triggers the token refresh, and skipping it logs users out at random.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // A network failure is not the same as being signed out, and must not be
  // treated as one. Redirecting on a dropped request sends a signed-in visitor
  // to /login; the next request succeeds, sees a session, and sends them back
  // to /home — and on a flaky link the two bounce off each other indefinitely,
  // piling up history entries until the tab locks up. On a transport error we
  // let the request through untouched and let the page's own check decide.
  if (isAuthRetryableFetchError(error)) {
    return response;
  }

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname === "/manifest.webmanifest";

  if (!user && !isPublic) {
    // Captured before the clone is rewritten below.
    const target = `${pathname}${request.nextUrl.search}`;

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Remember where they were headed so login can send them back — query
    // included, so a link to a specific month survives the detour. The login
    // action still runs this through its own same-origin check before
    // redirecting, so a crafted value cannot become an open redirect.
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", target);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next's own internals, the icons folder, and the
     * service worker — those must load even when signed out, or the install
     * prompt and offline shell break.
     *
     * `_next` is excluded wholesale rather than just `_next/static`: dev-mode
     * HMR and RSC payload requests also live under that prefix, and each one
     * that reached this function cost a full round trip to the Supabase auth
     * server.
     */
    "/((?!_next/|favicon.ico|icons/|sw.js|offline.html|.*\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
