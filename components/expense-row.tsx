import { Icon } from "@/components/icon";
import { toneOf, UNCATEGORISED_ICON } from "@/lib/categories";
import { formatCurrency, formatMoney, formatRelativeDate } from "@/lib/format";
import type { ExpenseWithCategory } from "@/lib/supabase/types";
import { DeleteExpense } from "@/components/delete-expense";
import { PressLink } from "@/components/pressable";

/**
 * One transaction: the category's glyph, its name, the figure.
 *
 * An earlier version used an icon inside a tinted circle, which put a heavy
 * graphic anchor on every row; the one after that stripped it back to a plain
 * colour dot, which scanned poorly and leaned entirely on hue. A bare tinted
 * glyph is the middle ground — recognisable at a glance, no container weight,
 * and legible when the colours are not.
 *
 * When `href` is set the reading part of the row becomes the link and the
 * delete control sits beside it, never inside it: a button nested in a link is
 * both invalid and impossible to hit reliably.
 */
export function ExpenseRow({
  expense,
  currency,
  deletable = false,
  showDate = true,
  href,
}: {
  expense: ExpenseWithCategory;
  currency: string;
  deletable?: boolean;
  showDate?: boolean;
  /** Makes the row open something — the edit screen, in practice. */
  href?: string;
}) {
  const tone = toneOf(expense.category?.tone);
  const name = expense.category?.name ?? "Uncategorised";
  const icon = expense.category?.icon ?? UNCATEGORISED_ICON;

  // What was actually typed, for entries made in another currency. The row
  // still leads with the stored primary amount — that is the one that adds up
  // — with the original trailing it as provenance rather than as a second
  // figure competing for the same job.
  const original =
    expense.original_amount != null && expense.original_currency
      ? formatCurrency(Number(expense.original_amount), expense.original_currency, {
          compact: true,
        })
      : null;

  const meta = [
    original,
    expense.note,
    showDate ? formatRelativeDate(expense.spent_at) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      {/* The category's own glyph rather than an anonymous dot. Every category
          already carries one, and a shape is recognisable at a glance in a way
          six differently-coloured dots are not — colour alone also fails for
          anyone who cannot separate the hues. */}
      <Icon
        name={icon}
        size={19}
        className="shrink-0 self-start"
        style={{ color: tone.color, marginTop: "0.3rem" }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-title text-ink">{name}</p>
        {meta ? (
          <p className="truncate pt-0.5 text-meta text-ink-faint">{meta}</p>
        ) : null}
      </div>

      <p className="tabular shrink-0 text-title font-normal text-ink">
        {formatMoney(Number(expense.amount), currency, { compact: true })}
      </p>
    </>
  );

  return (
    <div className="flex items-baseline gap-3 border-b border-line py-4 last:border-b-0">
      {href ? (
        <PressLink
          href={href}
          className="tap tap-subtle -mx-2 flex flex-1 items-baseline gap-3 rounded-lg px-2"
        >
          {body}
        </PressLink>
      ) : (
        body
      )}

      {deletable ? <DeleteExpense id={expense.id} name={name} /> : null}
    </div>
  );
}
