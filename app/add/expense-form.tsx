"use client";

import { useActionState, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { toneOf } from "@/lib/categories";
import { todayIso, toDateIso } from "@/lib/format";
import type { Category } from "@/lib/supabase/types";
import { createExpense, type ExpenseFormState } from "./actions";

const EMPTY: ExpenseFormState = {};

/** Digits before the decimal point. Past this the figure stops fitting. */
const MAX_WHOLE_DIGITS = 9;

function yesterdayIso() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toDateIso(date);
}

/** "1250.5" → "1,250.5", preserving a trailing "." while the user is typing. */
function groupDigits(raw: string): string {
  if (!raw) return "0";
  const [whole, decimals] = raw.split(".");
  const grouped = Number(whole || "0").toLocaleString("en-US");
  if (decimals === undefined) return grouped;
  return `${grouped}.${decimals}`;
}

export function ExpenseForm({
  categories,
  currency,
}: {
  categories: Category[];
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(createExpense, EMPTY);

  const [raw, setRaw] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [spentAt, setSpentAt] = useState(todayIso());
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  const today = todayIso();
  const yesterday = yesterdayIso();
  const amount = Number(raw || "0");
  const ready = amount > 0 && categoryId !== "";

  function press(key: string) {
    setRaw((current) => {
      if (key === "back") return current.slice(0, -1);

      if (key === ".") {
        if (current.includes(".")) return current;
        return current === "" ? "0." : `${current}.`;
      }

      const [whole, decimals] = current.split(".");
      if (decimals !== undefined) {
        if (decimals.length >= 2) return current;
        return `${current}${key}`;
      }
      if (whole.length >= MAX_WHOLE_DIGITS) return current;
      // Avoid "007".
      if (current === "0") return key;
      return `${current}${key}`;
    });
  }

  const display = groupDigits(raw);
  // Shrink the figure as it grows so it never wraps or clips.
  const figureSize =
    display.length > 12
      ? "2.5rem"
      : display.length > 9
        ? "3.25rem"
        : display.length > 6
          ? "3.75rem"
          : "4.5rem";

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="amount" value={raw} />
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="spent_at" value={spentAt} />
      <input type="hidden" name="note" value={note} />

      {/* ---- 1. The amount. Everything else on this screen is subordinate. -- */}
      <section className="flex flex-col items-center px-gutter pb-8 pt-6">
        <span className="text-label uppercase text-ink-faint">Amount</span>
        <div className="mt-4 flex items-baseline justify-center gap-2.5">
          <span className="text-figure-sm font-light text-ink-faint">{currency}</span>
          <span
            key={display}
            className="tabular animate-tick font-extralight text-ink"
            style={{
              fontSize: figureSize,
              lineHeight: 1,
              letterSpacing: "-0.05em",
              color: raw === "" ? "var(--color-ink-faint)" : undefined,
            }}
          >
            {display}
          </span>
        </div>
      </section>

      {/* ---- 2. Category. ------------------------------------------------- */}
      <section className="pb-5">
        {categories.length === 0 ? (
          <p className="px-gutter text-meta text-ink-faint">
            No categories yet — add one in Settings first.
          </p>
        ) : (
          <div className="hide-scrollbar flex gap-2 overflow-x-auto px-gutter">
            {categories.map((category) => {
              const selected = category.id === categoryId;
              const tone = toneOf(category.tone);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  aria-pressed={selected}
                  className={`tap flex shrink-0 items-center gap-2 rounded-full border py-2.5 pl-3 pr-4 text-body ${
                    selected
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-ink-muted"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: selected ? "var(--color-paper)" : tone.hex,
                    }}
                  />
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- 3. Date and note, kept quiet. -------------------------------- */}
      <section className="flex flex-col gap-3 px-gutter pb-5">
        <div className="flex items-center gap-2">
          {[
            { label: "Today", value: today },
            { label: "Yesterday", value: yesterday },
          ].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpentAt(value)}
              aria-pressed={spentAt === value}
              className={`tap rounded-full px-3 py-1.5 text-meta ${
                spentAt === value
                  ? "bg-paper-sunk text-ink"
                  : "text-ink-faint hover:text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}

          <label className="relative ml-auto">
            <span className="sr-only">Pick a date</span>
            <input
              type="date"
              value={spentAt}
              max={today}
              onChange={(event) => setSpentAt(event.target.value || today)}
              className="w-[7.5rem] rounded-full bg-transparent px-2 py-1.5 text-right text-meta
                text-ink-faint focus:text-ink focus:outline-none"
            />
          </label>
        </div>

        {noteOpen || note ? (
          <input
            type="text"
            value={note}
            autoFocus={noteOpen}
            maxLength={280}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What was this for?"
            className="w-full border-0 border-b border-line bg-transparent px-0 pb-2 pt-1
              text-body text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="tap flex items-center gap-1.5 self-start text-meta text-ink-faint"
          >
            <Icon name="add" size={16} />
            Add a note
          </button>
        )}
      </section>

      {state.error ? (
        <p role="alert" className="mx-gutter mb-3 text-meta text-negative">
          {state.error}
        </p>
      ) : null}

      {/* ---- 4. Keypad. Keeps the OS keyboard off the figure. ------------- */}
      <Keypad onPress={press} />

      <div
        className="px-gutter pt-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="submit"
          disabled={!ready || pending}
          className="tap flex h-14 w-full items-center justify-center gap-2 rounded-full
            bg-accent text-title text-on-accent
            disabled:bg-paper-sunk disabled:text-ink-faint"
        >
          {pending ? (
            <>
              <Icon name="progress_activity" size={20} className="animate-spin" />
              Saving
            </>
          ) : (
            "Save expense"
          )}
        </button>
      </div>
    </form>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

function Keypad({ onPress }: { onPress: (key: string) => void }) {
  // Hardware keyboard should work too — this screen is reachable on desktop.
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      if (/^[0-9]$/.test(event.key)) onPress(event.key);
      else if (event.key === "." || event.key === ",") onPress(".");
      else if (event.key === "Backspace") onPress("back");
      else return;

      event.preventDefault();
    }

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onPress]);

  return (
    <div className="mt-auto grid grid-cols-3 gap-px bg-line px-0">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onPress(key)}
          aria-label={key === "back" ? "Delete last digit" : key}
          className="tap flex h-16 items-center justify-center bg-paper text-figure-sm
            font-light text-ink active:bg-paper-dim"
        >
          {key === "back" ? (
            <Icon name="backspace" size={22} className="text-ink-muted" />
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}
