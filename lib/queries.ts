import "server-only";

import { requireUser } from "@/lib/supabase/server";
import {
  monthElapsed,
  monthRange,
  parseMonthIso,
  toMonthIso,
} from "@/lib/format";
import type {
  Category,
  ExpenseWithCategory,
  Profile,
  Subscription,
  SubscriptionWithCategory,
} from "@/lib/supabase/types";
import { DUE_SOON_DAYS } from "@/lib/subscriptions";

/** Shape returned by the `category_totals` SQL function. */
export type CategoryTotal = {
  category_id: string;
  category_name: string;
  icon: string;
  tone: string;
  monthly_budget: number | null;
  total: number;
  entries: number;
};

/**
 * The signed-in user's profile. The sign-up trigger creates this row, but a
 * user created before the trigger existed would not have one — so fall back to
 * sane defaults rather than crashing the dashboard.
 */
export async function getProfile(): Promise<Profile> {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    data ?? {
      id: user.id,
      display_name: user.email?.split("@")[0] ?? null,
      currency: "Rs.",
      secondary_currency: null,
      monthly_budget: 0,
      created_at: new Date().toISOString(),
    }
  );
}

export async function getCategories(): Promise<Category[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`Couldn't load categories: ${error.message}`);
  return data ?? [];
}

/** Newest expenses first, joined to their category for the list rows. */
export async function getRecentExpenses(
  limit = 8,
): Promise<ExpenseWithCategory[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("expenses")
    .select("*, category:categories(id, name, icon, tone)")
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Couldn't load expenses: ${error.message}`);
  return (data ?? []) as ExpenseWithCategory[];
}

export async function getExpensesBetween(
  from: string,
  to: string,
): Promise<ExpenseWithCategory[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("expenses")
    .select("*, category:categories(id, name, icon, tone)")
    .gte("spent_at", from)
    .lte("spent_at", to)
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Couldn't load expenses: ${error.message}`);
  return (data ?? []) as ExpenseWithCategory[];
}

/** Per-category totals for a date range, grouped in Postgres. */
export async function getCategoryTotals(
  from: string,
  to: string,
): Promise<CategoryTotal[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("category_totals", {
    from_date: from,
    to_date: to,
  });

  if (error) throw new Error(`Couldn't load the breakdown: ${error.message}`);
  return (data ?? []) as CategoryTotal[];
}

/** Sum of `amount` over a date range. */
async function sumBetween(from: string, to: string): Promise<number> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .gte("spent_at", from)
    .lte("spent_at", to);

  if (error) throw new Error(`Couldn't total your spending: ${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}

export type MonthSummary = {
  total: number;
  previousTotal: number;
  /** Percent change vs the month before; null when there is nothing to compare. */
  changePercent: number | null;
  budget: number;
  remaining: number;
  /** Share of the budget used, 0–100+ (can exceed 100 when over budget). */
  usedPercent: number;
  daysLeft: number;
  /** How far through the month we are, 0–1. A past month is 1. */
  elapsed: number;
  /** What a perfectly even spender would have spent by now. */
  expected: number;
  /**
   * Actual minus expected. Positive means spending faster than the budget
   * allows. This is the number that makes a budget actionable: "62% used" says
   * nothing without knowing whether it is the 5th or the 25th.
   */
  paceDelta: number;
};

/** Everything the headline card needs, for any month. */
export async function getMonthSummary(
  budget: number,
  month: string = toMonthIso(),
): Promise<MonthSummary> {
  const first = parseMonthIso(month);
  const current = monthRange(first);
  const previous = monthRange(
    new Date(first.getFullYear(), first.getMonth() - 1, 1),
  );

  const [total, previousTotal] = await Promise.all([
    sumBetween(current.start, current.end),
    sumBetween(previous.start, previous.end),
  ]);

  const daysInMonth = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();

  const elapsed = monthElapsed(month);
  const isCurrent = month === toMonthIso();
  const expected = budget > 0 ? budget * elapsed : 0;

  return {
    total,
    previousTotal,
    changePercent:
      previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
    budget,
    remaining: budget - total,
    usedPercent: budget > 0 ? (total / budget) * 100 : 0,
    daysLeft: isCurrent ? daysInMonth - new Date().getDate() : 0,
    elapsed,
    expected,
    paceDelta: budget > 0 ? total - expected : 0,
  };
}

export type MonthTotal = { month: string; total: number };

/**
 * Totals for the last `count` months, oldest first.
 *
 * One query for the whole window rather than one per month: the rows are
 * narrow (an amount and a date) and grouping them here costs nothing, whereas
 * six round trips would each carry their own auth check and latency.
 */
export async function getMonthlyTotals(
  count = 6,
  endMonth: string = toMonthIso(),
): Promise<MonthTotal[]> {
  const { supabase } = await requireUser();

  const last = parseMonthIso(endMonth);
  const firstMonth = new Date(last.getFullYear(), last.getMonth() - (count - 1), 1);

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, spent_at")
    .gte("spent_at", monthRange(firstMonth).start)
    .lte("spent_at", monthRange(last).end);

  if (error) throw new Error(`Couldn't load the trend: ${error.message}`);

  // Seed every bucket so a month with no spending still renders as a gap
  // rather than silently collapsing the axis.
  const buckets = new Map<string, number>();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1);
    buckets.set(toMonthIso(date), 0);
  }

  for (const row of data ?? []) {
    const key = String(row.spent_at).slice(0, 7);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.amount));
    }
  }

  return [...buckets.entries()].map(([month, total]) => ({ month, total }));
}

/**
 * Categories, most-recently-used first.
 *
 * The add screen's chip row is the one place ordering is worth a query: a
 * fixed `sort_order` puts the category you pick five times a day wherever it
 * happened to be created, so the common case scrolls. Ranking by recent use
 * keeps it under the thumb. Ties fall back to the stored order, so the row
 * does not reshuffle on every visit.
 */
export async function getCategoriesRanked(): Promise<Category[]> {
  const { supabase } = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - 60);

  const [categories, recent] = await Promise.all([
    getCategories(),
    supabase
      .from("expenses")
      .select("category_id")
      .gte("spent_at", toDateIsoLocal(since)),
  ]);

  if (recent.error) return categories;

  const uses = new Map<string, number>();
  for (const row of recent.data ?? []) {
    if (!row.category_id) continue;
    uses.set(row.category_id, (uses.get(row.category_id) ?? 0) + 1);
  }

  return [...categories].sort(
    (a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0),
  );
}

function toDateIsoLocal(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A single expense, for the edit screen. Null when it is not the caller's. */
export async function getExpense(
  id: string,
): Promise<ExpenseWithCategory | null> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("expenses")
    .select("*, category:categories(id, name, icon, tone)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Couldn't load that expense: ${error.message}`);
  return (data as ExpenseWithCategory | null) ?? null;
}

export type QuickPick = {
  categoryId: string;
  categoryName: string;
  tone: string;
  icon: string;
  amount: number;
  /** How many times this exact pairing has been logged recently. */
  count: number;
};

/**
 * The handful of (category, amount) pairings this person logs over and over.
 *
 * Expense tracking is mostly repetition — the same coffee, the same fare, the
 * same lunch. Typing those digits again every day is the single biggest cost
 * in the app, so the pairings that recur get promoted to one-tap buttons.
 *
 * Amounts are bucketed to the nearest whole unit before counting, so a 450 and
 * a 450.00 are the same habit. Only pairings seen more than once qualify: a
 * one-off is not a habit, and offering it would push a real one off the row.
 */
export async function getQuickPicks(limit = 4): Promise<QuickPick[]> {
  const { supabase } = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, category:categories(id, name, icon, tone)")
    .gte("spent_at", toDateIsoLocal(since))
    .not("category_id", "is", null);

  if (error || !data) return [];

  const tally = new Map<string, QuickPick>();

  for (const row of data as unknown as Array<{
    amount: number;
    category: { id: string; name: string; icon: string; tone: string } | null;
  }>) {
    if (!row.category) continue;

    const amount = Math.round(Number(row.amount));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const key = `${row.category.id}:${amount}`;
    const existing = tally.get(key);

    if (existing) existing.count += 1;
    else
      tally.set(key, {
        categoryId: row.category.id,
        categoryName: row.category.name,
        tone: row.category.tone,
        icon: row.category.icon,
        amount,
        count: 1,
      });
  }

  return [...tally.values()]
    .filter((pick) => pick.count > 1)
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Round amounts this person actually uses, for the keypad's shortcut row.
 *
 * Generic presets (100 / 500 / 1000) are wrong for most people and for most
 * currencies. These come from the real distribution instead, so someone whose
 * life is 80s and 250s is offered 80 and 250. Falls back to nothing rather
 * than to invented numbers — an empty row is better than a misleading one.
 */
export async function getCommonAmounts(limit = 4): Promise<number[]> {
  const { supabase } = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - 180);

  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .gte("spent_at", toDateIsoLocal(since));

  if (error || !data) return [];

  const tally = new Map<number, number>();
  for (const row of data) {
    const amount = Math.round(Number(row.amount));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    tally.set(amount, (tally.get(amount) ?? 0) + 1);
  }

  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([amount]) => amount)
    .sort((a, b) => a - b);
}

export type CategoryChange = CategoryTotal & {
  /** Same category's total in the previous month. */
  previous: number;
  /** Signed difference against that month. */
  delta: number;
};

/**
 * This month's categories, each carrying what it did last month.
 *
 * A breakdown alone says where money went; it does not say what *changed*,
 * which is the only part you can act on. Pairing each row with the previous
 * month turns a list into a diff.
 */
export async function getCategoryChanges(
  month: string,
): Promise<CategoryChange[]> {
  const first = parseMonthIso(month);
  const current = monthRange(first);
  const previous = monthRange(
    new Date(first.getFullYear(), first.getMonth() - 1, 1),
  );

  const [now, before] = await Promise.all([
    getCategoryTotals(current.start, current.end),
    getCategoryTotals(previous.start, previous.end),
  ]);

  const priorByCategory = new Map(
    before.map((row) => [row.category_id, Number(row.total)]),
  );

  return now
    .map((row) => {
      const total = Number(row.total);
      const prior = priorByCategory.get(row.category_id) ?? 0;
      return { ...row, total, previous: prior, delta: total - prior };
    })
    .sort((a, b) => b.total - a.total);
}

/** The few transactions that actually moved the month's number. */
export async function getLargestExpenses(
  from: string,
  to: string,
  limit = 3,
): Promise<ExpenseWithCategory[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("expenses")
    .select("*, category:categories(id, name, icon, tone)")
    .gte("spent_at", from)
    .lte("spent_at", to)
    .order("amount", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as ExpenseWithCategory[];
}

/* ---------------------------------------------------------------------------
   Subscriptions.
   --------------------------------------------------------------------------- */

/**
 * Every subscription, soonest first, with cancelled ones last.
 *
 * Ordering is by `active` then `next_due` in Postgres rather than in JS,
 * because that is exactly the index migration 002 creates — the list arrives
 * in display order without a sort.
 */
export async function getSubscriptions(): Promise<SubscriptionWithCategory[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, category:categories(id, name, icon, tone)")
    .order("active", { ascending: false })
    .order("next_due", { ascending: true });

  if (error) throw new Error(`Couldn't load subscriptions: ${error.message}`);
  return (data ?? []) as SubscriptionWithCategory[];
}

/**
 * The active subscriptions due within `withinDays`, including overdue ones.
 *
 * This is the only subscription query the Home screen runs: a list of what is
 * *coming* is planning, and Home is for acting. Anything further out is a
 * settings concern.
 */
export async function getDueSubscriptions(
  withinDays = DUE_SOON_DAYS,
): Promise<SubscriptionWithCategory[]> {
  const { supabase } = await requireUser();

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, category:categories(id, name, icon, tone)")
    .eq("active", true)
    .lte("next_due", toDateIsoLocal(horizon))
    .order("next_due", { ascending: true });

  // A failed reminder must not take the dashboard down with it.
  if (error) return [];
  return (data ?? []) as SubscriptionWithCategory[];
}

/** A single subscription, or null when it is not the caller's. */
export async function getSubscription(
  id: string,
): Promise<Subscription | null> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;
  return (data as Subscription | null) ?? null;
}
