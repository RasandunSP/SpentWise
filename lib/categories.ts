import type { CategoryTone } from "@/lib/supabase/types";

/**
 * Category colour tones — the categorical palette for every data mark.
 *
 * These resolve to CSS variables rather than literal hex, because the palette
 * has two instances: the light steps and a separate set chosen for the dark
 * surface. Both live in app/globals.css. A dark palette is *selected against
 * its own surface*, never produced by inverting the light one.
 *
 * Both sets were checked with the dataviz palette validator and pass all six
 * checks — lightness band, chroma floor, CVD separation, normal-vision floor
 * and 3:1 contrast:
 *
 *   light on #ffffff  worst adjacent ΔE 11.7 deutan / normal 16.5
 *   dark  on #0e1116  worst all-pairs ΔE 9.5 deutan, 9.0 tritan / normal 16.7
 *
 * Do not nudge these by eye — re-run the validator if they ever change.
 *
 * `slate` is the reserved neutral for "Other" and for expenses whose category
 * was deleted. It sits below the chroma floor on purpose (that is what makes it
 * read as de-emphasised), so every screen that uses it also direct-labels the
 * category by name and icon — identity never rests on colour alone.
 */
export const CATEGORY_TONES: Record<
  CategoryTone,
  { color: string; label: string }
> = {
  blue: { color: "var(--tone-blue)", label: "Blue" },
  teal: { color: "var(--tone-teal)", label: "Teal" },
  rose: { color: "var(--tone-rose)", label: "Rose" },
  amber: { color: "var(--tone-amber)", label: "Amber" },
  violet: { color: "var(--tone-violet)", label: "Violet" },
  slate: { color: "var(--tone-slate)", label: "Grey" },
};

export const TONE_KEYS = Object.keys(CATEGORY_TONES) as CategoryTone[];

export function toneOf(tone: string | null | undefined) {
  return CATEGORY_TONES[(tone ?? "slate") as CategoryTone] ?? CATEGORY_TONES.slate;
}

/** A low-opacity wash of the tone, for icon bubbles and selected chips. */
export function toneWash(color: string): string {
  return `color-mix(in srgb, ${color} 12%, transparent)`;
}

/**
 * Icon options offered when creating a category. All are valid ligatures from
 * https://fonts.google.com/icons (Material Symbols Outlined).
 */
export const ICON_CHOICES = [
  "restaurant",
  "local_cafe",
  "shopping_cart",
  "shopping_bag",
  "directions_car",
  "local_gas_station",
  "directions_bus",
  "home",
  "receipt_long",
  "bolt",
  "wifi",
  "medical_services",
  "fitness_center",
  "school",
  "movie",
  "sports_esports",
  "flight",
  "pets",
  "redeem",
  "savings",
  "phone_iphone",
  "checkroom",
  "content_cut",
  "more_horiz",
] as const;

/** Fallback icon for an expense whose category was deleted. */
export const UNCATEGORISED_ICON = "receipt_long";
