import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * `cookies()` is async in Next.js 16, so this is async too — always `await`
 * it. Wrapped in React's `cache()`, which memoizes per request: every caller
 * in one render pass shares a single client instead of constructing a new
 * SupabaseClient (and its realtime machinery) each time. The cache is torn
 * down with the request, so no client is ever reused across requests.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't write cookies. That's fine — proxy.ts
            // refreshes the session on every request, so the tokens stay live.
          }
        },
      },
    },
  );
});

/**
 * Verifies the session against Supabase, once per request.
 *
 * `getUser()` is a network round trip to the auth server every time it is
 * called — it deliberately does not trust the cookie. A page that called it
 * from each of its data functions therefore fired half a dozen identical
 * requests per navigation, which is what buried the logs in
 * `AuthRetryableFetchError` under any packet loss. `cache()` collapses them
 * into one.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error };
});

/**
 * Returns the signed-in user, or sends them to /login.
 *
 * Always uses `getUser()` (which verifies the JWT with Supabase) rather than
 * `getSession()` (which trusts the cookie) — cookies are attacker-writable.
 * proxy.ts checks this too, but a proxy matcher is a routing convenience, not
 * a security boundary, so the check is repeated here where it counts.
 */
export async function requireUser() {
  const [supabase, { user, error }] = await Promise.all([
    createClient(),
    getAuthUser(),
  ]);

  // Couldn't reach the auth server at all. Surfacing that to the nearest
  // error boundary is the honest answer; redirecting to /login would claim
  // the user is signed out, and since proxy.ts lets them straight back in
  // once the next request succeeds, the two would bounce the tab between
  // /login and /home for as long as the connection stayed flaky.
  if (isAuthRetryableFetchError(error)) {
    throw new Error("Couldn't reach the server. Check your connection.");
  }

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}
