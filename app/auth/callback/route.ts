import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for the link in confirmation and password-reset emails.
 * Supabase sends the user here with a one-time `code`, which we trade for a
 * session cookie before forwarding them into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  // Only ever redirect to a path on this origin — an open redirect here would
  // hand the session to whatever host an attacker put in the query string.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "That sign-in link has expired. Please request a new one.",
    )}`,
  );
}
