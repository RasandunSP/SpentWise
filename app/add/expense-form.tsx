"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { PressButton } from "@/components/pressable";
import { toneOf } from "@/lib/categories";
import { formatMoney, todayIso, toDateIso } from "@/lib/format";
import type { Category, ExpenseWithCategory } from "@/lib/supabase/types";
import {
  createExpense,
  updateExpense,
  type ExpenseFormState,
} from "./actions";

const EMPTY: ExpenseFormState = {};

/** Digits before the decimal point. Past this the figure stops fitting. */
const MAX_WHOLE_DIGITS = 9;

function yesterdayIso() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toDateIso(date);
}

/** 1250.5 → "1250.5", 1250 → "1250" — seeds the keypad from a stored amount. */
function stripTrailingZeros(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(Math.round(value * 100) / 100);
}

/** "1250.5" → "1,250.5", preserving a trailing "." while the user is typing. */
function groupDigits(raw: string): string {
  if (!raw) return "0";
  const [whole, decimals] = raw.split(".");
  const grouped = Number(whole || "0").toLocaleString("en-US");
  if (decimals === undefined) return grouped;
  return `${grouped}.${decimals}`;
}

/**
 * The amount/category/date/note form, used to both create and correct.
 *
 * Editing reuses this screen rather than getting its own: it is the same four
 * fields and the same keypad, and a second, subtly different form is how the
 * two drift apart. Passing an `expense` seeds the fields and swaps the action.
 */
export function ExpenseForm({
  categories,
  currency,
  expense,
  commonAmounts = [],
  secondaryCurrency = null,
  secondaryRate = null,
  primaryCode,
}: {
  categories: Category[];
  currency: string;
  /** Present when correcting an existing entry. */
  expense?: ExpenseWithCategory;
  /** Round amounts this person actually uses, offered above the keypad. */
  commonAmounts?: number[];
  /** ISO code of the second currency, when one is configured. */
  secondaryCurrency?: string | null;
  /** Primary units per 1 secondary unit — for the live preview only. */
  secondaryRate?: number | null;
  /** ISO code of the ledger's own currency. */
  primaryCode: string;
}) {
  const editing = expense !== undefined;

  const [state, formAction, pending] = useActionState(
    // `.bind` pins the id server-side, so the row being edited is never
    // something the client can swap in the form payload.
    editing ? updateExpense.bind(null, expense.id) : createExpense,
    EMPTY,
  );

  const [raw, setRaw] = useState(
    expense
      ? stripTrailingZeros(
          Number(expense.original_amount ?? expense.amount),
        )
      : "",
  );
  const [categoryId, setCategoryId] = useState(
    expense?.category_id ?? categories[0]?.id ?? "",
  );
  const [spentAt, setSpentAt] = useState(
    expense ? expense.spent_at.slice(0, 10) : todayIso(),
  );
  const [note, setNote] = useState(expense?.note ?? "");
  const [noteOpen, setNoteOpen] = useState(false);

  // An entry made abroad reopens in the currency it was made in, so correcting
  // it does not silently re-denominate the amount.
  const [entryCurrency, setEntryCurrency] = useState(
    expense?.original_currency ?? primaryCode,
  );

  const formRef = useRef<HTMLFormElement | null>(null);
  const router = useRouter();

  const today = todayIso();
  const yesterday = yesterdayIso();
  const amount = Number(raw || "0");
  const ready = amount > 0 && categoryId !== "";

  // This screen is reachable on a desktop, where the keypad is a mouse target
  // and the real input device is the keyboard. Enter commits, Escape backs
  // out — the two things a keyboard user will try first.
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/home");
        return;
      }

      if (event.key !== "Enter") return;

      // Inside the note field Enter should submit too, but a modifier means
      // the user is reaching for something else — leave it alone.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (!ready || pending) return;
      event.preventDefault();
      formRef.current?.requestSubmit();
    }

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [ready, pending, router]);

  // Memoised: Keypad subscribes to `keydown` with this in its dependency
  // array, so a fresh identity on every keystroke would tear the listener
  // down and re-add it on each render. Only the updater form of setRaw is
  // used, so nothing from the render scope is captured.
  const press = useCallback((key: string) => {
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
  }, []);

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
    <form
      ref={formRef}
      action={formAction}
      /* `justify-center` rather than pushing the keypad to the bottom with
         `mt-auto`: on a tall window that left a void between the note row and
         the keys, and the form read as two disconnected halves. Centred, the
         block stays together at any height and still sits low enough on a
         phone to be thumb-reachable. */
      className="flex min-h-0 flex-1 flex-col justify-center"
    >
      <input type="hidden" name="amount" value={raw} />
      <input type="hidden" name="currency" value={entryCurrency} />
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="spent_at" value={spentAt} />
      <input type="hidden" name="note" value={note} />

      {/* ---- 1. The amount. Everything else on this screen is subordinate. -- */}
      <section className="flex flex-col items-center px-gutter pb-8 pt-6">
        <span className="text-label uppercase text-ink-faint">Amount</span>
        <div className="mt-4 flex items-baseline justify-center gap-2.5">
          <span className="text-figure-sm font-light text-ink-faint">
            {entryCurrency === primaryCode ? currency : entryCurrency}
          </span>
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

        {/* Only when a second currency is configured — otherwise this is a
            toggle with one option, which is furniture. */}
        {secondaryCurrency ? (
          <div className="mt-5 flex items-center gap-1 rounded-full bg-paper-sunk p-1">
            {[primaryCode, secondaryCurrency].map((code) => {
              const active = entryCurrency === code;
              return (
                <PressButton
                  key={code}
                  type="button"
                  onClick={() => setEntryCurrency(code)}
                  aria-pressed={active}
                  className={`tap rounded-full px-4 py-1.5 text-meta ${
                    active ? "bg-paper text-ink shadow-sm" : "text-ink-faint"
                  }`}
                >
                  {code}
                </PressButton>
              );
            })}
          </div>
        ) : null}

        {/* The converted figure while typing. It is a preview, not the value
            that gets saved — the server re-converts against its own rates. */}
        {secondaryCurrency &&
        entryCurrency === secondaryCurrency &&
        secondaryRate &&
        amount > 0 ? (
          <p className="tabular pt-3 text-meta text-ink-faint">
            ≈ {formatMoney(amount * secondaryRate, currency)}
          </p>
        ) : null}
      </section>

      {/* ---- 2. Category. ------------------------------------------------- */}
      <section className="pb-5">
        {categories.length === 0 ? (
          <p className="px-gutter text-meta text-ink-faint">
            No categories yet — add one in Settings first.
          </p>
        ) : (
          /* Wrapping, not a scroller. A horizontal strip hid every category
             past the fourth behind an edge with no affordance — on the one
             screen where picking a category is half the task. Wrapped, they
             are all visible and all one tap away. */
          <div className="flex flex-wrap gap-2 px-gutter">
            {categories.map((category) => {
              const selected = category.id === categoryId;
              const tone = toneOf(category.tone);

              return (
                <PressButton
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
                  <Icon
                    name={category.icon}
                    size={17}
                    style={{ color: selected ? "var(--color-paper)" : tone.color }}
                  />
                  {category.name}
                </PressButton>
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
            <PressButton
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
            </PressButton>
          ))}

          <label className="relative ml-auto">
            <span className="sr-only">Pick a date</span>
            <input
              type="date"
              value={spentAt}
              max={today}
              onChange={(event) => setSpentAt(event.target.value || today)}
              /* Was fixed at 7.5rem, which clipped the native control's own
                 rendering to "13-09-202". Let it size to its content. */
              className="w-auto min-w-[9.5rem] rounded-full bg-transparent px-2 py-1.5
                text-right text-meta text-ink-faint focus:text-ink focus:outline-none"
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
          <PressButton
            type="button"
            onClick={() => setNoteOpen(true)}
            className="tap flex items-center gap-1.5 self-start text-meta text-ink-faint"
          >
            <Icon name="add" size={16} />
            Add a note
          </PressButton>
        )}
      </section>

      {state.error ? (
        <p role="alert" className="mx-gutter mb-3 text-meta text-negative">
          {state.error}
        </p>
      ) : null}

      {/* ---- 4. Shortcuts, then the keypad. ------------------------------ */}
      {commonAmounts.length > 0 && entryCurrency === primaryCode ? (
        <div className="hide-scrollbar flex gap-2 overflow-x-auto px-gutter pb-3">
          {commonAmounts.map((value) => (
            <PressButton
              key={value}
              type="button"
              onClick={() => setRaw(String(value))}
              className="tap tabular shrink-0 rounded-full border border-line px-4 py-2
                text-meta text-ink-muted"
            >
              {formatMoney(value, currency, { compact: true })}
            </PressButton>
          ))}
        </div>
      ) : null}

      <Keypad onPress={press} />

      <div
        className="px-gutter pt-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <PressButton
          type="submit"
          haptic
          disabled={!ready || pending}
          className="tap tap-subtle flex h-14 w-full items-center justify-center gap-2
            rounded-full bg-accent text-title text-on-accent
            disabled:bg-paper-sunk disabled:text-ink-faint"
        >
          {pending ? (
            <>
              <Icon name="progress_activity" size={20} className="animate-spin" />
              Saving
            </>
          ) : (
            <>{editing ? "Save changes" : "Save expense"}</>
          )}
        </PressButton>
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
    <div className="grid grid-cols-3 gap-px bg-line px-0">
      {KEYS.map((key) => (
        <PressButton
          key={key}
          type="button"
          haptic
          // Highlighted on pointer-down, committed on the click that follows:
          // the acknowledgement is instant, but dragging off a key still
          // cancels it the way a physical keypad would.
          onClick={() => onPress(key)}
          aria-label={key === "back" ? "Delete last digit" : key}
          className="tap flex h-16 items-center justify-center bg-paper text-figure-sm
            font-light text-ink data-[pressed=true]:bg-paper-sunk"
        >
          {key === "back" ? (
            <Icon name="backspace" size={22} className="text-ink-muted" />
          ) : (
            key
          )}
        </PressButton>
      ))}
    </div>
  );
}
