import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * `cookies()` is async in Next.js 16, so this is async too — always `await`
 * it. Never hold the returned client across requests; make a new one per call.
 */
export async function createClient() {
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
}

/**
 * Returns the signed-in user, or sends them to /login.
 *
 * Always uses `getUser()` (which verifies the JWT with Supabase) rather than
 * `getSession()` (which trusts the cookie) — cookies are attacker-writable.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}
