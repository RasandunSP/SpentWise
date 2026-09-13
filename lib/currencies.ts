/**
 * Currency codes for the pickers.
 *
 * The provider quotes 166 currencies and the app can convert between any of
 * them, so the full list comes from the rate data at runtime rather than being
 * duplicated here. What lives here is the short list worth putting first — the
 * ones someone banking in Sri Lanka is most likely to need — because a
 * 166-item list with no order is a worse control than a 12-item one.
 */
export const COMMON_CURRENCIES = [
  "LKR",
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AED",
  "SAR",
  "SGD",
  "MYR",
  "THB",
  "AUD",
] as const;

let displayNames: Intl.DisplayNames | null | undefined;

/** "BDT" → "Bangladeshi Taka". Falls back to the code itself. */
export function currencyName(code: string): string {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(["en"], { type: "currency" });
    } catch {
      displayNames = null;
    }
  }
  try {
    return displayNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Splits every quoted currency into the short list and the rest, both sorted,
 * so a picker can group them without knowing anything about the data.
 */
export function groupCurrencies(codes: string[]) {
  const common = COMMON_CURRENCIES.filter((code) => codes.includes(code));
  const rest = codes
    .filter((code) => !COMMON_CURRENCIES.includes(code as never))
    .sort();
  return { common, rest };
}
