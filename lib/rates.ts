import "server-only";

/**
 * Foreign exchange, fetched once a day and cached.
 *
 * The app's ledger is kept in one currency — everything totalled, budgeted and
 * reported is LKR — and a second currency is a *lens* on top of that, for the
 * stretches spent abroad. Storing mixed currencies in the totals would make
 * every sum meaningless, so an amount entered in another currency is converted
 * on the way in and the original is kept alongside it for the record.
 */

/** The ledger's currency. Everything is stored and reported in this. */
export const PRIMARY_CURRENCY = "LKR";

const ENDPOINT = "https://v6.exchangerate-api.com/v6";

export type Rates = {
  /** Always PRIMARY_CURRENCY — every rate is "1 primary = n of this". */
  base: string;
  rates: Record<string, number>;
  /** When the provider last published, ISO. */
  updatedAt: string;
  /** When it will publish next, ISO. */
  nextUpdateAt: string;
};

type ApiResponse = {
  result: "success" | "error";
  "error-type"?: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
  time_next_update_unix: number;
};

/**
 * Seconds until the provider's next publication, just past midnight UTC.
 *
 * The free tier refreshes once a day at 00:00 UTC, so the cache is pinned to
 * that boundary rather than to a rolling 24 hours: a rolling window would
 * drift, and eventually spend a request on data that has not changed. A minute
 * of slack avoids racing the publication itself.
 */
function secondsUntilNextUpdate(): number {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    1,
    0,
  );
  const seconds = Math.ceil((midnight - now.getTime()) / 1000);
  // Never zero or negative — that would disable caching entirely.
  return Math.max(60, seconds);
}

/**
 * Today's rates, or null when they cannot be had.
 *
 * Returns null rather than throwing: currency conversion is an enhancement,
 * and a provider outage should cost the user the converter, not the app. Every
 * caller is expected to render something sensible without it.
 */
export async function getRates(): Promise<Rates | null> {
  const key = process.env.EXCHANGERATE_API_KEY;
  if (!key) return null;

  try {
    const response = await fetch(
      `${ENDPOINT}/${key}/latest/${PRIMARY_CURRENCY}`,
      {
        // Opts this request into the Data Cache — fetch is uncached by default
        // in this version. One upstream call per day, shared by every user and
        // every screen, regardless of how often the converter is opened.
        next: { revalidate: secondsUntilNextUpdate(), tags: ["fx-rates"] },
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as ApiResponse;
    if (data.result !== "success" || !data.conversion_rates) return null;

    return {
      base: data.base_code,
      rates: data.conversion_rates,
      updatedAt: new Date(data.time_last_update_unix * 1000).toISOString(),
      nextUpdateAt: new Date(data.time_next_update_unix * 1000).toISOString(),
    };
  } catch {
    // Network down, DNS, timeout — all the same answer to the caller.
    return null;
  }
}

/**
 * Converts between any two currencies the provider quotes.
 *
 * Rates are all relative to the base, so crossing two of them is a ratio. Done
 * here rather than by asking the API per pair, which is what keeps the
 * converter instant and the daily request count at one.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Rates,
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;

  const fromRate = rates.rates[from];
  const toRate = rates.rates[to];
  if (!fromRate || !toRate) return null;

  return (amount / fromRate) * toRate;
}

/** What the ledger should store for a typed amount, or why it cannot. */
export type ResolvedAmount =
  | {
      ok: true;
      /** Always in PRIMARY_CURRENCY. */
      amount: number;
      /** What was typed, when that was not the primary currency. */
      original: { amount: number; currency: string } | null;
    }
  | { ok: false; error: string };

/**
 * Resolves a typed amount into what the ledger stores.
 *
 * The conversion happens on the server, against rates the client never sees —
 * the browser is shown a live preview while typing, but an amount that reached
 * the database from a number the page calculated would be trusting the client
 * with the value of the entry.
 *
 * A missing rate is a hard failure rather than a silent fallback to the raw
 * number: saving 5,000 BDT as 5,000 LKR would corrupt the totals quietly, and
 * a quiet corruption is worse than a refused save.
 *
 * Every write that can carry a foreign amount goes through here — the manual
 * entry, the correction, and the logged subscription — so the three cannot
 * drift into converting differently.
 */
export async function toPrimaryAmount(
  amount: number,
  currency: string,
): Promise<ResolvedAmount> {
  if (currency === PRIMARY_CURRENCY) {
    return { ok: true, amount, original: null };
  }

  const rates = await getRates();
  if (!rates) {
    return {
      ok: false,
      error: "Couldn't reach today's exchange rates. Try again in a moment.",
    };
  }

  const converted = convert(amount, currency, PRIMARY_CURRENCY, rates);
  if (converted === null) {
    return { ok: false, error: `No rate available for ${currency}.` };
  }

  return {
    ok: true,
    amount: Math.round(converted * 100) / 100,
    original: { amount, currency },
  };
}

/**
 * True when Postgres rejected a write because a column from migration 002 is
 * not there yet.
 *
 * The multi-currency columns are additive, so everything else keeps working
 * without them — but a write that touches one fails with a PostgREST schema
 * error that means nothing to the person looking at the screen. Translating it
 * into the actual next step is the difference between a dead end and a to-do.
 */
export function isMissingCurrencyColumn(error: {
  code?: string;
  message?: string;
}): boolean {
  const text = `${error.code ?? ""} ${error.message ?? ""}`;
  return (
    /PGRST204|42703|schema cache/i.test(text) &&
    /secondary_currency|original_amount|original_currency/i.test(text)
  );
}

export const MIGRATION_HINT =
  "Multi-currency needs one database update — run supabase/002-currency-and-subscriptions.sql in the Supabase SQL editor.";
