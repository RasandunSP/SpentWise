import { Icon } from "@/components/icon";
import { toneOf } from "@/lib/categories";
import { formatMoney, formatRelativeDate } from "@/lib/format";
import type { ExpenseWithCategory } from "@/lib/supabase/types";
import { deleteExpense } from "@/app/add/actions";

/**
 * One transaction: a colour dot, the category, the figure. The old icon-in-a-
 * tinted-circle treatment put a heavy graphic anchor on every row and made a
 * list of five look like a control panel — a 6px dot identifies the category
 * just as well and lets the amounts carry the row.
 */
export function ExpenseRow({
  expense,
  currency,
  deletable = false,
  showDate = true,
}: {
  expense: ExpenseWithCategory;
  currency: string;
  deletable?: boolean;
  showDate?: boolean;
}) {
  const tone = toneOf(expense.category?.tone);
  const name = expense.category?.name ?? "Uncategorised";

  const meta = [expense.note, showDate ? formatRelativeDate(expense.spent_at) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group flex items-baseline gap-3 border-b border-line py-4 last:border-b-0">
      <span
        className="mt-2 h-1.5 w-1.5 shrink-0 self-start rounded-full"
        style={{ backgroundColor: tone.hex, marginTop: "0.55rem" }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-title text-ink">{name}</p>
        {meta ? <p className="truncate pt-0.5 text-meta text-ink-faint">{meta}</p> : null}
      </div>

      <p className="tabular shrink-0 text-title font-normal text-ink">
        {formatMoney(Number(expense.amount), currency, { compact: true })}
      </p>

      {deletable ? (
        <form action={deleteExpense} className="shrink-0 self-center">
          <input type="hidden" name="id" value={expense.id} />
          <button
            type="submit"
            aria-label={`Delete ${name} expense`}
            className="tap -mr-2 flex h-9 w-9 items-center justify-center rounded-full
              text-ink-faint hover:bg-negative-soft hover:text-negative"
          >
            <Icon name="close" size={18} />
          </button>
        </form>
      ) : null}
    </div>
  );
}
