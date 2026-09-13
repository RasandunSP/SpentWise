import { parseDateOnly, todayIso, toDateIso } from "@/lib/format";
import type { SubscriptionCadence } from "@/lib/supabase/types";

/**
 * Recurring charges — the schedule, not the spending.
 *
 * A subscription is a *promise* of an expense, and the two are deliberately
 * different things: the ledger only ever contains charges the user confirmed
 * happened. Logging one turns it into an ordinary expense and rolls the
 * schedule forward; nothing is ever posted automatically, so a service that
 * quietly stopped billing can never keep billing the ledger.
 *
 * No "server-only" here: the pickers and the due card both need these, and
 * every function is pure date arithmetic with nothing worth hiding.
 */

/** How far ahead the Home card looks. A week is one glance-ahead of planning. */
export const DUE_SOON_DAYS = 7;

export const CADENCES: ReadonlyArray<{
  key: SubscriptionCadence;
  label: string;
  /** Reads after an amount: "Rs. 1,200 a month". */
  per: string;
}> = [
  { key: "weekly", label: "Weekly", per: "a week" },
  { key: "monthly", label: "Monthly", per: "a month" },
  { key: "yearly", label: "Yearly", per: "a year" },
];

export const CADENCE_KEYS = CADENCES.map((c) => c.key);

export function cadenceLabel(cadence: string): string {
  return CADENCES.find((c) => c.key === cadence)?.label ?? "Monthly";
}

export function cadencePer(cadence: string): string {
  return CADENCES.find((c) => c.key === cadence)?.per ?? "a month";
}

/**
 * The next due date, one period on.
 *
 * Advances by exactly one period per call rather than jumping past today: a
 * subscription three months overdue represents three real charges, and
 * skipping to the next future date would quietly swallow two of them.
 *
 * Month ends are clamped — 31 Jan billing monthly lands on 28 Feb, not 3 Mar.
 * The clamp is lossy, so that subscription then continues on the 28th; storing
 * a separate billing anchor would fix it, at the cost of a column that only
 * three days of the month would ever use.
 */
export function advanceDue(dueIso: string, cadence: SubscriptionCadence): string {
  const date = parseDateOnly(dueIso);

  if (cadence === "weekly") {
    date.setDate(date.getDate() + 7);
    return toDateIso(date);
  }

  const day = date.getDate();
  const months = cadence === "yearly" ? 12 : 1;

  // Shift from the 1st, never from the 31st: `setMonth` on a 31st rolls
  // January straight into March, because February has no 31st.
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));

  return toDateIso(target);
}

/** Whole days from today to `dueIso`. Negative means it has already passed. */
export function daysUntil(dueIso: string): number {
  const today = parseDateOnly(todayIso());
  const due = parseDateOnly(dueIso);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export type DueState = "overdue" | "today" | "soon" | "later";

export function dueState(dueIso: string): DueState {
  const days = daysUntil(dueIso);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return days <= DUE_SOON_DAYS ? "soon" : "later";
}

/** "3 days overdue" / "Due today" / "Due in 4 days" / "Due 14 Oct". */
export function dueLabel(dueIso: string): string {
  const days = daysUntil(dueIso);

  if (days < 0) {
    const late = Math.abs(days);
    return late === 1 ? "1 day overdue" : `${late} days overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= DUE_SOON_DAYS) return `Due in ${days} days`;

  const due = parseDateOnly(dueIso);
  return `Due ${due.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(due.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" }
      : {}),
  })}`;
}

/**
 * What a charge costs per month, whatever its cadence.
 *
 * Weekly is 52/12, not 4 — four-week months would under-count the year by a
 * whole month's worth. This is the only figure that makes cadences comparable,
 * and it is labelled as an equivalent everywhere it appears, because it is not
 * a number that will ever appear on a statement.
 */
export function monthlyEquivalent(
  amount: number,
  cadence: SubscriptionCadence,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (cadence === "weekly") return (amount * 52) / 12;
  if (cadence === "yearly") return amount / 12;
  return amount;
}
