"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { PressButton } from "@/components/pressable";

/** Never emits — the value it guards flips once, at hydration. */
function subscribeNever() {
  return () => {};
}

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
] as const;

/**
 * Three segments, no icons, no dropdown.
 *
 * The whole control is one row of text — the same weight as everything else in
 * Settings — so adding the capability costs almost no visual surface. "Auto" is
 * the default and simply follows the device.
 *
 * Rendered as a placeholder until mounted: the active segment depends on
 * localStorage, which the server cannot know, and painting the wrong one first
 * would make the control flicker on every load.
 */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  // Hydration check without a setState-in-effect: the server snapshot is
  // false, the client snapshot true, and nothing ever changes after that.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="flex items-center gap-1 rounded-full bg-paper-sunk p-1"
    >
      {OPTIONS.map(({ value, label }) => {
        const active = mounted && theme === value;

        return (
          <PressButton
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={`tap flex-1 rounded-full px-4 py-2 text-meta ${
              active ? "bg-paper text-ink shadow-sm" : "text-ink-faint"
            }`}
          >
            {label}
          </PressButton>
        );
      })}
    </div>
  );
}
