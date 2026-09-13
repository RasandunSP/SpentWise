"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { ICON_CHOICES, TONE_KEYS } from "@/lib/categories";
import { isMissingCurrencyColumn, MIGRATION_HINT } from "@/lib/rates";

export type SettingsState = { error?: string; notice?: string };

function parseMoney(raw: FormDataEntryValue | null): number | null {
  const cleaned = String(raw ?? "").replace(/,/g, "").trim();
  if (!cleaned) return 0;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999_999) return null;
  return Math.round(value * 100) / 100;
}

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, user } = await requireUser();

  const displayName = String(formData.get("display_name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim() || "Rs.";
  const monthlyBudget = parseMoney(formData.get("monthly_budget"));

  // "" is a real choice here — it means "back to one currency" — so an empty
  // value clears the column rather than being treated as "unchanged".
  const rawSecondary = String(formData.get("secondary_currency") ?? "")
    .trim()
    .toUpperCase();
  const secondaryCurrency = rawSecondary === "" ? null : rawSecondary;

  if (monthlyBudget === null) {
    return { error: "Enter a budget of zero or more." };
  }
  if (currency.length > 5) {
    return { error: "Currency symbols are at most 5 characters." };
  }
  if (secondaryCurrency !== null && !/^[A-Z]{3}$/.test(secondaryCurrency)) {
    return { error: "Pick a currency from the list." };
  }

  const { error } = await supabase
    .from("profiles")
    // upsert, not update: covers accounts created before the sign-up trigger.
    .upsert({
      id: user.id,
      display_name: displayName || null,
      currency,
      secondary_currency: secondaryCurrency,
      monthly_budget: monthlyBudget,
    });

  if (error) {
    if (isMissingCurrencyColumn(error)) return { error: MIGRATION_HINT };
    return { error: `Couldn't save: ${error.message}` };
  }

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/settings");
  revalidatePath("/convert");
  revalidatePath("/add");
  return { notice: "Saved." };
}

export async function createCategory(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "more_horiz");
  const tone = String(formData.get("tone") ?? "slate");
  const budget = parseMoney(formData.get("monthly_budget"));

  if (!name) return { error: "Give the category a name." };
  if (name.length > 40) return { error: "Keep names under 40 characters." };
  if (budget === null) return { error: "Enter a budget of zero or more." };

  // Only allow values the UI offers — these reach a CHECK constraint otherwise.
  const safeIcon = (ICON_CHOICES as readonly string[]).includes(icon)
    ? icon
    : "more_horiz";
  const safeTone = (TONE_KEYS as string[]).includes(tone) ? tone : "slate";

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    icon: safeIcon,
    tone: safeTone,
    monthly_budget: budget > 0 ? budget : null,
    sort_order: 100,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? `You already have a category called "${name}".`
          : `Couldn't add it: ${error.message}`,
    };
  }

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/settings");
  revalidatePath("/add");
  return { notice: `Added ${name}.` };
}

export async function updateCategoryBudget(formData: FormData) {
  const { supabase, user } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const budget = parseMoney(formData.get("monthly_budget"));
  if (!id || budget === null) return;

  await supabase
    .from("categories")
    .update({ monthly_budget: budget > 0 ? budget : null })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function deleteCategory(id: string): Promise<string | undefined> {
  const { supabase, user } = await requireUser();

  if (!id) return "Nothing to delete.";

  // Expenses survive — the FK is ON DELETE SET NULL, so they become
  // "Uncategorised" rather than vanishing from the user's history.
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return `Couldn't delete that: ${error.message}`;

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/settings");
  revalidatePath("/add");
}
