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
  currency: string;
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
  amount: number;
  note: string | null;
  spent_at: string;
  created_at: string;
};

/** An expense joined to its category, which is how every screen reads them. */
export type ExpenseWithCategory = Expense & {
  category: Pick<Category, "id" | "name" | "icon" | "tone"> | null;
};
