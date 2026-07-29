"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { ICON_CHOICES, TONE_KEYS } from "@/lib/categories";

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

  if (monthlyBudget === null) {
    return { error: "Enter a budget of zero or more." };
  }
  if (currency.length > 5) {
    return { error: "Currency symbols are at most 5 characters." };
  }

  const { error } = await supabase
    .from("profiles")
    // upsert, not update: covers accounts created before the sign-up trigger.
    .upsert({
      id: user.id,
      display_name: displayName || null,
      currency,
      monthly_budget: monthlyBudget,
    });

  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/settings");
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

export async function deleteCategory(formData: FormData) {
  const { supabase, user } = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Expenses survive — the FK is ON DELETE SET NULL, so they become
  // "Uncategorised" rather than vanishing from the user's history.
  await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/home");
  revalidatePath("/reports");
  revalidatePath("/settings");
  revalidatePath("/add");
}
