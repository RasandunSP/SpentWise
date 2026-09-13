"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { PRIMARY_CURRENCY, toPrimaryAmount } from "@/lib/rates";
import { advanceDue, CADENCE_KEYS } from "@/lib/subscriptions";
import { todayIso } from "@/lib/format";
import type { SubscriptionCadence } from "@/lib/supabase/types";
import type { SettingsState } from "./actions";

/**
 * Subscriptions are a schedule; expenses are what happened.
 *
 * Nothing here ever posts a charge on its own. Logging one is always a
 * deliberate tap, which is what keeps the ledger a record of confirmed
 * spending rather than of assumptions — a service that silently stopped
 * billing can never keep charging the totals.
 */

/** Everything a screen touching subscriptions has to be re-rendered for. */
function revalidateSubscriptions() {
  revalidatePath("/home");
  revalidatePath("/settings");
}

function parseAmount(raw: FormDataEntryValue | null): number | null {
  const cleaned = String(raw ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  // numeric(12,2) in Postgres — anything larger is rejected there anyway.
  if (value > 9_999_999_999) return null;

  return Math.round(value * 100) / 100;
}

type ParsedFields =
  | {
      ok: true;
      values: {
        name: string;
        category_id: string | null;
        amount: number;
        currency: string | null;
        cadence: SubscriptionCadence;
        next_due: string;
      };
    }
  | { ok: false; error: string };

/** Reads and checks every field the two forms share. */
function readFields(formData: FormData): ParsedFields {
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const nextDue = String(formData.get("next_due") ?? "").trim();
  const cadence = String(formData.get("cadence") ?? "monthly");

  const rawCurrency = String(formData.get("currency") ?? "")
    .trim()
    .toUpperCase();

  if (!name) return { ok: false, error: "Give the subscription a name." };
  if (name.length > 60) {
    return { ok: false, error: "Keep names under 60 characters." };
  }
  if (amount === null) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) {
    return { ok: false, error: "Pick the next date it is charged." };
  }
  if (!(CADENCE_KEYS as string[]).includes(cadence)) {
    return { ok: false, error: "Pick how often it repeats." };
  }
  if (rawCurrency && !/^[A-Z]{3}$/.test(rawCurrency)) {
    return { ok: false, error: "Pick a currency from the list." };
  }

  return {
    ok: true,
    values: {
      name,
      category_id: categoryId || null,
      amount,
      // The ledger's own currency is stored as null, not as "LKR": that is what
      // the column means, and it keeps a subscription correct if the ledger's
      // display symbol is ever changed.
      currency:
        rawCurrency && rawCurrency !== PRIMARY_CURRENCY ? rawCurrency : null,
      cadence: cadence as SubscriptionCadence,
      next_due: nextDue,
    },
  };
}

export async function createSubscription(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  // Re-checked here rather than trusted from the page: Server Actions are
  // reachable by direct POST.
  const { supabase, user } = await requireUser();

  const parsed = readFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("subscriptions")
    .insert({ user_id: user.id, ...parsed.values });

  if (error) return { error: `Couldn't add it: ${error.message}` };

  revalidateSubscriptions();
  return { notice: `Added ${parsed.values.name}.` };
}

export async function updateSubscription(
  id: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, user } = await requireUser();

  const parsed = readFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("subscriptions")
    .update(parsed.values)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: `Couldn't save that: ${error.message}` };

  revalidateSubscriptions();
  return { notice: "Saved." };
}

/**
 * Cancels or resumes one.
 *
 * Cancelling keeps the row: expenses were logged from it, and "what did I stop
 * paying for" is a question worth being able to answer. It simply stops being
 * counted and stops appearing on Home.
 */
export async function setSubscriptionActive(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("subscriptions")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: `Couldn't update that: ${error.message}` };

  revalidateSubscriptions();
  return {};
}

export async function deleteSubscription(
  id: string,
): Promise<string | undefined> {
  const { supabase, user } = await requireUser();

  if (!id) return "Nothing to delete.";

  // Expenses already logged from it are ordinary rows, and are untouched.
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return `Couldn't delete that: ${error.message}`;

  revalidateSubscriptions();
}

/** What the toast needs to describe the log, and to take it back. */
export type LoggedSubscription = {
  expenseId: string;
  /** The due date before it rolled forward, so undo restores it exactly. */
  previousDue: string;
  name: string;
  /** In the ledger's currency — what was actually added to the totals. */
  amount: number;
};

/**
 * Turns a due subscription into a real expense, and rolls the schedule on.
 *
 * The amount, name and category come from the stored row rather than from the
 * caller: the client says *which* subscription, never what it costs.
 *
 * Dated on the due date, not on today — that is when the charge happened — but
 * never in the future, because logging one early is a confirmation that it has
 * gone through, and a future-dated expense would sit outside the month whose
 * total it belongs to.
 *
 * The schedule advances by exactly one period, so a subscription three months
 * overdue takes three taps and produces three expenses, which is three real
 * charges rather than one.
 */
export async function logSubscription(
  id: string,
): Promise<{ error?: string; logged?: LoggedSubscription }> {
  const { supabase, user } = await requireUser();

  const { data: subscription, error: readError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) return { error: `Couldn't log that: ${readError.message}` };
  if (!subscription) return { error: "That subscription is gone." };

  const resolved = await toPrimaryAmount(
    Number(subscription.amount),
    subscription.currency ?? PRIMARY_CURRENCY,
  );
  if (!resolved.ok) return { error: resolved.error };

  const today = todayIso();
  const spentAt = subscription.next_due > today ? today : subscription.next_due;

  const { data: expense, error: insertError } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      category_id: subscription.category_id,
      amount: resolved.amount,
      ...(resolved.original
        ? {
            original_amount: resolved.original.amount,
            original_currency: resolved.original.currency,
          }
        : {}),
      // The name is the note — otherwise the ledger shows a bare figure with
      // no way to tell which subscription it came from.
      note: subscription.name,
      spent_at: spentAt,
    })
    .select("id")
    .single();

  if (insertError) return { error: `Couldn't log that: ${insertError.message}` };

  const { error: rollError } = await supabase
    .from("subscriptions")
    .update({
      next_due: advanceDue(subscription.next_due, subscription.cadence),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  // The expense is already saved. Rolling the date is what stops the reminder
  // repeating, so say plainly that it will come back rather than implying the
  // whole thing failed.
  if (rollError) {
    revalidatePath("/home");
    revalidatePath("/reports");
    revalidatePath("/expenses");
    return {
      error: `Logged it, but the reminder didn't move on: ${rollError.message}`,
    };
  }

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");
  revalidatePath("/settings");

  return {
    logged: {
      expenseId: expense.id,
      previousDue: subscription.next_due,
      name: subscription.name,
      amount: resolved.amount,
    },
  };
}

/**
 * Moves the schedule on without logging anything.
 *
 * For the month a charge did not happen — a free period, a plan paid some
 * other way, a price holiday. Without this the only way to clear the reminder
 * would be to log an expense that never occurred.
 */
export async function skipSubscription(
  id: string,
): Promise<{ error?: string; previousDue?: string; name?: string }> {
  const { supabase, user } = await requireUser();

  const { data: subscription, error: readError } = await supabase
    .from("subscriptions")
    .select("id, name, next_due, cadence")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) return { error: `Couldn't skip that: ${readError.message}` };
  if (!subscription) return { error: "That subscription is gone." };

  const { error } = await supabase
    .from("subscriptions")
    .update({
      next_due: advanceDue(subscription.next_due, subscription.cadence),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: `Couldn't skip that: ${error.message}` };

  revalidateSubscriptions();
  return { previousDue: subscription.next_due, name: subscription.name };
}

/**
 * Puts the schedule back where it was, and removes the expense if one was made.
 *
 * Undo for both logging and skipping. A log writes to two tables, so taking it
 * back has to reverse both or it leaves the ledger disagreeing with the
 * schedule. The date is restored to the exact value it held rather than being
 * wound back by one period, so an undo is still correct if the cadence changed
 * in between.
 */
export async function undoSubscriptionLog(
  id: string,
  previousDue: string,
  expenseId?: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(previousDue)) {
    return { error: "Couldn't undo that." };
  }

  if (expenseId) {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("user_id", user.id);

    if (error) return { error: `Couldn't undo that: ${error.message}` };
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ next_due: previousDue })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: `Couldn't undo that: ${error.message}` };

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/expenses");
  revalidatePath("/settings");
  return {};
}
