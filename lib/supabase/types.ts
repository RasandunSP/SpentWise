/**
 * Row shapes for the tables created by `supabase/schema.sql`.
 *
 * Hand-written on purpose: the schema is small and stable, and this avoids
 * needing the Supabase CLI in the loop. If you later run
 * `npx supabase gen types typescript --project-id <id>`, replace this file.
 */

export type Profile = {
  id: string;
  display_name: string | null;
  /** Display prefix for the primary currency, e.g. "Rs." — not an ISO code. */
  currency: string;
  /** ISO code offered alongside LKR when adding, or null for single-currency. */
  secondary_currency: string | null;
  monthly_budget: number;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  /** Material Symbols ligature, e.g. "restaurant". */
  icon: string;
  /** One of the keys in lib/categories.ts `CATEGORY_TONES`. */
  tone: CategoryTone;
  monthly_budget: number | null;
  sort_order: number;
  created_at: string;
};

export type CategoryTone =
  | "blue"
  | "teal"
  | "rose"
  | "amber"
  | "violet"
  | "slate";

export type Expense = {
  id: string;
  user_id: string;
  category_id: string | null;
  /** Always in the primary currency — this is what every total sums. */
  amount: number;
  /** What was typed, when it was not the primary currency. */
  original_amount: number | null;
  original_currency: string | null;
  note: string | null;
  spent_at: string;
  created_at: string;
};

/** An expense joined to its category, which is how every screen reads them. */
export type ExpenseWithCategory = Expense & {
  category: Pick<Category, "id" | "name" | "icon" | "tone"> | null;
};

export type SubscriptionCadence = "weekly" | "monthly" | "yearly";

/**
 * A recurring charge. A *schedule*, not a transaction — each time it is
 * actually charged it becomes an ordinary row in `expenses`.
 */
export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  amount: number;
  /** ISO code when it bills in another currency; null means the ledger's own. */
  currency: string | null;
  cadence: SubscriptionCadence;
  /** `YYYY-MM-DD` — the next date this is expected to be charged. */
  next_due: string;
  /** Cancelled subscriptions are kept, not deleted. */
  active: boolean;
  created_at: string;
};

export type SubscriptionWithCategory = Subscription & {
  category: Pick<Category, "id" | "name" | "icon" | "tone"> | null;
};
