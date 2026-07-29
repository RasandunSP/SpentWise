"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export type ExpenseFormState = { error?: string };

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

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    category_id: categoryId || null,
    amount,
    note: note || null,
    spent_at: spentAt,
  });

  if (error) {
    return { error: `Couldn't save that: ${error.message}` };
  }

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");
  redirect("/home");
}

export async function deleteExpense(formData: FormData) {
  const { supabase, user } = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // The `user_id` filter is belt-and-braces; RLS already scopes the delete.
  await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");
}
