import type { CategoryTone } from "@/lib/supabase/types";

/**
 * Category colour tones — the categorical palette for every data mark.
 *
 * The five coloured hues were checked with the dataviz palette validator
 * against the #f8f9ff surface and pass all six checks: lightness band, chroma
 * floor, CVD separation (worst adjacent pair ΔE 11.7 deutan), normal-vision
 * floor (ΔE 16.5) and 3:1 contrast. Do not nudge these values by eye — re-run
 * the validator if they ever need to change.
 *
 * `slate` is the reserved neutral for "Other" and for expenses whose category
 * was deleted. It sits below the chroma floor on purpose (that is what makes it
 * read as de-emphasised), so every screen that uses it also direct-labels the
 * category by name and icon — identity never rests on colour alone.
 */
export const CATEGORY_TONES: Record<
  CategoryTone,
  { hex: string; label: string }
> = {
  blue: { hex: "#1a58b7", label: "Blue" },
  teal: { hex: "#00968a", label: "Teal" },
  rose: { hex: "#b90538", label: "Rose" },
  amber: { hex: "#c2670a", label: "Amber" },
  violet: { hex: "#7c3aed", label: "Violet" },
  slate: { hex: "#5f6368", label: "Grey" },
};

export const TONE_KEYS = Object.keys(CATEGORY_TONES) as CategoryTone[];

export function toneOf(tone: string | null | undefined) {
  return CATEGORY_TONES[(tone ?? "slate") as CategoryTone] ?? CATEGORY_TONES.slate;
}

/** A 10%-opacity wash of the tone, for icon bubbles and selected chips. */
export function toneWash(hex: string): string {
  return `color-mix(in srgb, ${hex} 12%, transparent)`;
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
