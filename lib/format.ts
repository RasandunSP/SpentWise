/** Currency + date helpers. Everything user-facing goes through these. */

/**
 * Formats an amount the way DESIGN.md asks for: "Rs. 45,200.00" with grouping.
 * `compact` drops the cents, which is what the dense list rows use.
 */
export function formatMoney(
  amount: number,
  currency = "Rs.",
  { compact = false }: { compact?: boolean } = {},
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(value);
  return `${currency} ${formatted}`;
}

/** Splits the figure so the currency prefix can be rendered lighter than the number. */
export function splitMoney(amount: number, currency = "Rs.") {
  const value = Number.isFinite(amount) ? amount : 0;
  return {
    prefix: currency,
    number: new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value),
  };
}

/** "Today" / "Yesterday" / "12 Mar" — relative for the last two days only. */
export function formatRelativeDate(dateIso: string): string {
  const date = parseDateOnly(dateIso);
  const today = startOfToday();

  const diffDays = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Long form used on detail screens: "Wed, 12 March 2025". */
export function formatFullDate(dateIso: string): string {
  return parseDateOnly(dateIso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "March 2025" — month headings on the reports screen. */
export function formatMonthLabel(monthIso: string): string {
  return parseDateOnly(monthIso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Parses a `YYYY-MM-DD` column as a *local* date. `new Date("2025-03-12")`
 * parses as UTC midnight, which reads as the previous day west of Greenwich.
 */
export function parseDateOnly(dateIso: string): Date {
  const [year, month, day] = dateIso.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Today as `YYYY-MM-DD`, in the viewer's timezone. */
export function todayIso(): string {
  return toDateIso(new Date());
}

export function toDateIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** First and last day of the month containing `date`, as ISO date strings. */
export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toDateIso(start), end: toDateIso(end) };
}

/** Same, for the month before `date` — used for the month-over-month delta. */
export function previousMonthRange(date = new Date()) {
  return monthRange(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Clamps a percentage into 0–100 so a progress bar can never overflow. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
