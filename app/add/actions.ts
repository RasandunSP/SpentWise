"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import {
  isMissingCurrencyColumn,
  MIGRATION_HINT,
  PRIMARY_CURRENCY,
  toPrimaryAmount,
} from "@/lib/rates";

export type ExpenseFormState = { error?: string };

/** The currency the amount was typed in. Anything unrecognised is the ledger's. */
function readCurrency(formData: FormData): string {
  const raw = String(formData.get("currency") ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : PRIMARY_CURRENCY;
}

/**
 * Parses a user-typed amount into a positive number with 2 decimals.
 * Accepts "1,250.50" and "1250.5"; rejects anything else.
 */
function parseAmount(raw: FormDataEntryValue | null): number | null {
  const cleaned = String(raw ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;

  // numeric(12,2) in Postgres — anything larger would be rejected there.
  if (value > 9_999_999_999) return null;

  return Math.round(value * 100) / 100;
}

export async function createExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  // Re-checked here rather than trusted from proxy.ts: Server Actions are
  // reachable by direct POST.
  const { supabase, user } = await requireUser();

  const amount = parseAmount(formData.get("amount"));
  if (amount === null) {
    return { error: "Enter an amount greater than zero." };
  }

  const categoryId = String(formData.get("category_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const spentAt = String(formData.get("spent_at") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) {
    return { error: "Pick a valid date." };
  }
  if (note.length > 280) {
    return { error: "Keep the note under 280 characters." };
  }

  const resolved = await toPrimaryAmount(amount, readCurrency(formData));
  if (!resolved.ok) return { error: resolved.error };

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    category_id: categoryId || null,
    amount: resolved.amount,
    // Omitted entirely for ordinary primary-currency entries, so the common
    // path keeps working on a database that has not run migration 002.
    ...(resolved.original
      ? {
          original_amount: resolved.original.amount,
          original_currency: resolved.original.currency,
        }
      : {}),
    note: note || null,
    spent_at: spentAt,
  });

  if (error) {
    if (isMissingCurrencyColumn(error)) return { error: MIGRATION_HINT };
    return { error: `Couldn't save that: ${error.message}` };
  }

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");
  redirect("/home");
}

/**
 * Logs a repeat of something already logged before, in one tap.
 *
 * Takes the amount and category directly rather than a form: the whole point
 * is that there is no form. Dated today, no note — a repeat is by definition
 * the same thing again, and anything that needs saying can be added by
 * opening the entry afterwards.
 */
export async function quickAdd(
  categoryId: string,
  amount: number,
): Promise<{ error?: string; id?: string }> {
  const { supabase, user } = await requireUser();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "That amount is no longer valid." };
  }
  if (!categoryId) {
    return { error: "That category is gone." };
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      category_id: categoryId,
      amount: Math.round(amount * 100) / 100,
      spent_at: new Date().toLocaleDateString("en-CA"),
    })
    .select("id")
    .single();

  if (error) return { error: `Couldn't save that: ${error.message}` };

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");

  return { id: data.id };
}

/**
 * Saves an edit to an existing expense.
 *
 * Shares every validation rule with `createExpense` by going through the same
 * parser — a correction that accepted an amount the original would have
 * rejected would be a hole, not a feature.
 */
export async function updateExpense(
  id: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const { supabase, user } = await requireUser();

  const amount = parseAmount(formData.get("amount"));
  if (amount === null) {
    return { error: "Enter an amount greater than zero." };
  }

  const categoryId = String(formData.get("category_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const spentAt = String(formData.get("spent_at") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) {
    return { error: "Pick a valid date." };
  }
  if (note.length > 280) {
    return { error: "Keep the note under 280 characters." };
  }

  const resolved = await toPrimaryAmount(amount, readCurrency(formData));
  if (!resolved.ok) return { error: resolved.error };

  const { error } = await supabase
    .from("expenses")
    .update({
      category_id: categoryId || null,
      amount: resolved.amount,
      ...(resolved.original
        ? {
            original_amount: resolved.original.amount,
            original_currency: resolved.original.currency,
          }
        : {}),
      note: note || null,
      spent_at: spentAt,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (isMissingCurrencyColumn(error)) return { error: MIGRATION_HINT };
    return { error: `Couldn't save that: ${error.message}` };
  }

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");
  redirect("/expenses");
}

/** The fields needed to put a deleted expense back exactly as it was. */
export type DeletedExpense = {
  id: string;
  category_id: string | null;
  amount: number;
  note: string | null;
  spent_at: string;
  created_at: string;
};

/**
 * Deletes an expense and hands back enough to undo it.
 *
 * Deleting is one tap and reversing it is one tap, so a confirmation dialog
 * would cost every correct deletion a click to protect the rare wrong one.
 * Returning the row instead lets the caller offer Undo, which is both cheaper
 * and more forgiving — the mistake is recoverable rather than prevented.
 */
export async function deleteExpense(
  id: string,
): Promise<{ error?: string; deleted?: DeletedExpense }> {
  const { supabase, user } = await requireUser();

  if (!id) return { error: "Nothing to delete." };

  // Read it back first — after the delete there is nothing left to restore
  // from. The `user_id` filter is belt-and-braces; RLS already scopes this.
  const { data: row, error: readError } = await supabase
    .from("expenses")
    .select("id, category_id, amount, note, spent_at, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) return { error: `Couldn't delete that: ${readError.message}` };
  if (!row) return { error: "That expense is already gone." };

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: `Couldn't delete that: ${error.message}` };

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");

  return { deleted: row as DeletedExpense };
}

/**
 * Puts a deleted expense back.
 *
 * Re-inserts under the original id and timestamp rather than creating a new
 * row, so an undo restores the ledger exactly — the entry keeps its place in
 * the ordering instead of jumping to the top of the list.
 */
export async function restoreExpense(
  expense: DeletedExpense,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("expenses").insert({
    id: expense.id,
    user_id: user.id,
    category_id: expense.category_id,
    amount: expense.amount,
    note: expense.note,
    spent_at: expense.spent_at,
    created_at: expense.created_at,
  });

  if (error) return { error: `Couldn't restore that: ${error.message}` };

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");

  return {};
}
