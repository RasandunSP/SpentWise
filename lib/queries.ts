import "server-only";

import { requireUser } from "@/lib/supabase/server";
import { monthRange, previousMonthRange } from "@/lib/format";
import type {
  Category,
  ExpenseWithCategory,
  Profile,
} from "@/lib/supabase/types";

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
  /** Percent change vs last month; null when last month had nothing to compare. */
  changePercent: number | null;
  budget: number;
  remaining: number;
  /** Share of the budget used, 0–100+ (can exceed 100 when over budget). */
  usedPercent: number;
  daysLeft: number;
};

/** Everything the dashboard's headline card needs, in two round trips. */
export async function getMonthSummary(budget: number): Promise<MonthSummary> {
  const now = new Date();
  const current = monthRange(now);
  const previous = previousMonthRange(now);

  const [total, previousTotal] = await Promise.all([
    sumBetween(current.start, current.end),
    sumBetween(previous.start, previous.end),
  ]);

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  return {
    total,
    previousTotal,
    changePercent:
      previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
    budget,
    remaining: budget - total,
    usedPercent: budget > 0 ? (total / budget) * 100 : 0,
    daysLeft: daysInMonth - now.getDate(),
  };
}
