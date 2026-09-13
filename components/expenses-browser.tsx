"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { ExpenseRow } from "@/components/expense-row";
import { PressButton } from "@/components/pressable";
import { toneOf } from "@/lib/categories";
import { formatFullDate, formatMoney } from "@/lib/format";
import type { ExpenseWithCategory } from "@/lib/supabase/types";

/**
 * Below this many rows you can see the whole month at a glance, so a search
 * field would be furniture that never earns its place.
 */
const SEARCH_THRESHOLD = 8;

/**
 * The month's ledger, searchable and filterable.
 *
 * Filtering happens here rather than on the server: the month is already
 * loaded, it is bounded by definition, and a round trip per keystroke would
 * turn an instant narrowing into a laggy one. The URL still owns *which*
 * month — that is navigation — while narrowing within it is a view state that
 * should not create history entries.
 */
export function ExpensesBrowser({
  expenses,
  currency,
}: {
  expenses: ExpenseWithCategory[];
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // The categories actually present this month — offering one that would
  // return nothing is a dead control.
  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; tone: string }>();
    for (const expense of expenses) {
      if (expense.category && !seen.has(expense.category.id)) {
        seen.set(expense.category.id, {
          id: expense.category.id,
          name: expense.category.name,
          tone: expense.category.tone,
        });
      }
    }
    return [...seen.values()];
  }, [expenses]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return expenses.filter((expense) => {
      if (categoryId && expense.category_id !== categoryId) return false;
      if (!needle) return true;

      // Amount is searchable too — "1200" is often how you remember a purchase.
      return (
        (expense.note ?? "").toLowerCase().includes(needle) ||
        (expense.category?.name ?? "uncategorised").toLowerCase().includes(needle) ||
        String(expense.amount).includes(needle)
      );
    });
  }, [expenses, query, categoryId]);

  const byDay = useMemo(() => {
    const map = new Map<string, ExpenseWithCategory[]>();
    for (const expense of filtered) {
      const key = expense.spent_at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), expense]);
    }
    return [...map.entries()];
  }, [filtered]);

  const filtering = query.trim() !== "" || categoryId !== null;
  const shownTotal = filtered.reduce((sum, row) => sum + Number(row.amount), 0);

  if (expenses.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-body text-ink-muted">Nothing logged this month.</p>
        <p className="pt-1 text-meta text-ink-faint">
          Expenses you add will be listed here, newest first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {expenses.length >= SEARCH_THRESHOLD ? (
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Icon name="search" size={18} className="shrink-0 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, categories, amounts"
            aria-label="Search this month's expenses"
            className="w-full border-0 bg-transparent p-0 text-body text-ink
              placeholder:text-ink-faint focus:outline-none"
          />
          {query ? (
            <PressButton
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="tap -mr-1 flex h-7 w-7 shrink-0 items-center justify-center
                rounded-full text-ink-faint"
            >
              <Icon name="close" size={16} />
            </PressButton>
          ) : null}
        </div>
      ) : null}

      {categories.length > 1 ? (
        <div className="hide-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter py-3">
          <Chip
            label="All"
            active={categoryId === null}
            onClick={() => setCategoryId(null)}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              dot={toneOf(category.tone).color}
              active={categoryId === category.id}
              onClick={() =>
                setCategoryId(categoryId === category.id ? null : category.id)
              }
            />
          ))}
        </div>
      ) : null}

      {filtering ? (
        <p className="py-3 text-meta text-ink-faint">
          {filtered.length === 0
            ? "No matches"
            : `${filtered.length} of ${expenses.length} · ${formatMoney(
                shownTotal,
                currency,
                { compact: true },
              )}`}
        </p>
      ) : null}

      {byDay.map(([day, rows]) => {
        const dayTotal = rows.reduce((sum, row) => sum + Number(row.amount), 0);

        return (
          <section key={day} className="border-t border-line pt-5 first:border-t-0">
            <div className="flex items-baseline justify-between pb-1">
              <h2 className="text-label uppercase text-ink-faint">
                {formatFullDate(day)}
              </h2>
              <span className="tabular text-meta text-ink-faint">
                {formatMoney(dayTotal, currency, { compact: true })}
              </span>
            </div>
            <div className="flex flex-col pb-4">
              {rows.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  currency={currency}
                  showDate={false}
                  href={`/edit/${expense.id}`}
                  deletable
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Chip({
  label,
  dot,
  active,
  onClick,
}: {
  label: string;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <PressButton
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-3.5
        text-meta ${
          active ? "border-ink bg-ink text-paper" : "border-line text-ink-muted"
        }`}
    >
      {dot ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: active ? "var(--color-paper)" : dot }}
        />
      ) : null}
      {label}
    </PressButton>
  );
}
