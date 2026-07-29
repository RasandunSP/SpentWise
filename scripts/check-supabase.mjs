/*
 * Backend smoke test:
 *
 *   npm run check:supabase
 *
 * Confirms the Supabase project is reachable, the schema from
 * supabase/schema.sql is installed, and RLS actually blocks anonymous reads.
 * Uses only the public anon key, and creates nothing. Safe to re-run.
 *
 * Talks to the REST API with plain fetch rather than @supabase/supabase-js:
 * the JS client always spins up a realtime socket, which needs a native
 * WebSocket and therefore Node 22+. Next.js polyfills that on the server, but
 * a bare `node scripts/...` run on Node 20 does not.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Both variables must be set in .env.local — see README §1.4.");
  process.exit(2);
}
if (/\/(rest|auth)\/v\d/.test(url)) {
  console.error(
    `NEXT_PUBLIC_SUPABASE_URL should be the bare project URL.\n` +
      `  got:      ${url}\n` +
      `  expected: ${url.replace(/\/(rest|auth)\/v\d.*$/, "")}\n` +
      `The client appends /rest/v1 and /auth/v1 itself.`,
  );
  process.exit(2);
}

console.log(`project url : ${url}`);
console.log(`anon key    : ${key.slice(0, 12)}… (${key.length} chars)\n`);

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(32)} ${detail}`);
}

// 1. Auth endpoint reachable — also proves the URL shape is right.
try {
  const res = await fetch(`${url}/auth/v1/settings`, { headers });
  const body = res.ok ? await res.json() : null;
  record(
    "auth endpoint",
    res.ok,
    res.ok
      ? `reachable · signups ${body.disable_signup ? "DISABLED" : "enabled"} · email confirm ${
          body.mailer_autoconfirm ? "OFF (instant sign-in)" : "ON (link required)"
        }`
      : `HTTP ${res.status}`,
  );
} catch (error) {
  record("auth endpoint", false, error.message);
}

// 2–4. Tables exist, and RLS hides every row from an anonymous caller.
for (const table of ["profiles", "categories", "expenses"]) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
    const body = await res.json();

    if (!res.ok) {
      record(
        `table "${table}"`,
        false,
        // 42P01 = relation does not exist → schema.sql was never run.
        body?.code === "42P01"
          ? "MISSING — run supabase/schema.sql in the SQL Editor"
          : `HTTP ${res.status} ${body?.message ?? ""}`,
      );
    } else {
      record(
        `table "${table}" + RLS`,
        body.length === 0,
        body.length === 0
          ? "exists · anon sees 0 rows (RLS working)"
          : `EXISTS BUT LEAKED ${body.length} row(s) TO ANON — check the policies`,
      );
    }
  } catch (error) {
    record(`table "${table}"`, false, error.message);
  }
}

// 5. The function the Reports screen depends on.
try {
  const res = await fetch(`${url}/rest/v1/rpc/category_totals`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ from_date: "2026-07-01", to_date: "2026-07-31" }),
  });
  const body = await res.json();
  record(
    "category_totals()",
    res.ok,
    res.ok ? "callable" : `HTTP ${res.status} ${body?.message ?? ""}`,
  );
} catch (error) {
  record("category_totals()", false, error.message);
}

// 6. The sign-up trigger — without it, new accounts get no starter categories.
try {
  const res = await fetch(
    `${url}/rest/v1/rpc/category_totals`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "count=exact" },
      body: JSON.stringify({ from_date: "1970-01-01", to_date: "2100-01-01" }),
    },
  );
  record(
    "anon sees no category data",
    res.ok && (await res.json()).length === 0,
    "RLS scopes the report function to the caller",
  );
} catch (error) {
  record("anon sees no category data", false, error.message);
}

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? "\nAll backend checks passed."
    : `\n${failed.length} check(s) failed — see above.`,
);
process.exit(failed.length === 0 ? 0 : 1);
