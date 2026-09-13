"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { CATEGORY_TONES, ICON_CHOICES, TONE_KEYS, toneOf } from "@/lib/categories";
import { currencyName, groupCurrencies } from "@/lib/currencies";
import type { Category, CategoryTone, Profile } from "@/lib/supabase/types";
import { createCategory, updateProfile, type SettingsState } from "./actions";
import { PressButton } from "@/components/pressable";

const EMPTY: SettingsState = {};

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-meta text-negative">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p role="status" className="text-meta text-positive">
        {state.notice}
      </p>
    );
  }
  return null;
}

export function ProfileForm({
  profile,
  currencyCodes,
  primaryCode,
}: {
  profile: Profile;
  /** Every code the rate provider quotes; empty when rates are unavailable. */
  currencyCodes: string[];
  primaryCode: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, EMPTY);
  const { common, rest } = groupCurrencies(
    currencyCodes.filter((code) => code !== primaryCode),
  );

  return (
    <form action={action} className="flex flex-col gap-7">
      <TextField
        label="Name"
        name="display_name"
        defaultValue={profile.display_name ?? ""}
        placeholder="Your name"
        maxLength={60}
      />

      <div className="grid grid-cols-[5rem_1fr] gap-5">
        <TextField
          label="Symbol"
          name="currency"
          defaultValue={profile.currency}
          maxLength={5}
          placeholder="Rs."
        />
        <TextField
          label="Monthly budget"
          name="monthly_budget"
          type="text"
          inputMode="decimal"
          className="tabular"
          defaultValue={
            Number(profile.monthly_budget) > 0 ? String(profile.monthly_budget) : ""
          }
          placeholder="0"
          hint="Leave empty to hide budget tracking."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="secondary_currency"
          className="text-label uppercase text-ink-faint"
        >
          Second currency
        </label>
        {currencyCodes.length > 0 ? (
          <select
            id="secondary_currency"
            name="secondary_currency"
            defaultValue={profile.secondary_currency ?? ""}
            className="w-full appearance-none border-0 border-b border-line bg-transparent
              px-0 pb-2.5 pt-1.5 text-title text-ink focus:border-accent focus:outline-none"
          >
            <option value="">None — {primaryCode} only</option>
            <optgroup label="Common">
              {common.map((code) => (
                <option key={code} value={code}>
                  {code} · {currencyName(code)}
                </option>
              ))}
            </optgroup>
            <optgroup label="All currencies">
              {rest.map((code) => (
                <option key={code} value={code}>
                  {code} · {currencyName(code)}
                </option>
              ))}
            </optgroup>
          </select>
        ) : (
          <>
            {/* Keeps the saved choice intact when the provider is unreachable —
                submitting without this field would silently clear it. */}
            <input
              type="hidden"
              name="secondary_currency"
              value={profile.secondary_currency ?? ""}
            />
            <p className="pt-1.5 text-body text-ink-faint">
              {profile.secondary_currency ?? "None"} · rates unavailable
            </p>
          </>
        )}
        <p className="pt-1.5 text-meta text-ink-faint">
          Adds a second option when entering an amount. Everything is still
          stored and reported in {primaryCode}.
        </p>
      </div>

      <Feedback state={state} />

      <PressButton
        type="submit"
        disabled={pending}
        className="tap flex h-12 items-center justify-center gap-2 self-start rounded-full
          bg-ink px-8 text-title text-paper disabled:opacity-50"
      >
        {pending ? (
          <Icon name="progress_activity" size={18} className="animate-spin text-paper" />
        ) : null}
        Save
      </PressButton>
    </form>
  );
}

export function NewCategoryForm({ existing }: { existing: Category[] }) {
  const [state, action, pending] = useActionState(createCategory, EMPTY);
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState<string>("more_horiz");
  const [tone, setTone] = useState<CategoryTone>("blue");

  // Nudge towards a colour that isn't already in use.
  const used = new Set(existing.map((c) => c.tone));

  if (!open) {
    return (
      <PressButton
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex items-center gap-2 self-start pt-5 text-body text-accent"
      >
        <Icon name="add" size={18} className="text-accent" />
        New category
      </PressButton>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-7 border-t border-line pt-6">
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="tone" value={tone} />

      <TextField label="Name" name="name" required maxLength={40} placeholder="e.g. Groceries" />

      <TextField
        label="Monthly budget"
        name="monthly_budget"
        type="text"
        inputMode="decimal"
        className="tabular"
        placeholder="Optional"
      />

      <div className="flex flex-col gap-3">
        <span className="text-label uppercase text-ink-faint">Colour</span>
        <div className="flex flex-wrap gap-3">
          {TONE_KEYS.map((key) => (
            <PressButton
              key={key}
              type="button"
              onClick={() => setTone(key)}
              aria-pressed={tone === key}
              aria-label={`${CATEGORY_TONES[key].label}${used.has(key) ? " (already used)" : ""}`}
              className={`tap h-7 w-7 rounded-full ${
                tone === key ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""
              } ${used.has(key) && tone !== key ? "opacity-30" : ""}`}
              style={{ backgroundColor: CATEGORY_TONES[key].color }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label uppercase text-ink-faint">Icon</span>
        <div className="hide-scrollbar grid max-h-36 grid-cols-8 gap-1 overflow-y-auto">
          {ICON_CHOICES.map((choice) => (
            <PressButton
              key={choice}
              type="button"
              onClick={() => setIcon(choice)}
              aria-pressed={icon === choice}
              aria-label={choice.replace(/_/g, " ")}
              className={`tap flex aspect-square items-center justify-center rounded-md ${
                icon === choice ? "bg-paper-sunk" : ""
              }`}
              style={icon === choice ? { color: toneOf(tone).color } : undefined}
            >
              <Icon name={choice} size={20} />
            </PressButton>
          ))}
        </div>
      </div>

      <Feedback state={state} />

      <div className="flex items-center gap-2">
        <PressButton
          type="submit"
          disabled={pending}
          className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full
            bg-ink text-title text-paper disabled:opacity-50"
        >
          {pending ? (
            <Icon name="progress_activity" size={18} className="animate-spin text-paper" />
          ) : null}
          Add category
        </PressButton>
        <PressButton
          type="button"
          onClick={() => setOpen(false)}
          className="tap h-12 px-5 text-body text-ink-faint"
        >
          Cancel
        </PressButton>
      </div>
    </form>
  );
}
