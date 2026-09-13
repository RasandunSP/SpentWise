import { Icon } from "@/components/icon";
import { PressLink } from "@/components/pressable";
import { formatMoney, parseMonthIso } from "@/lib/format";
import type { MonthTotal } from "@/lib/queries";

/**
 * Six months of totals, as one row of bars.
 *
 * One series, so it wears ink rather than a category colour — a hue here would
 * imply a category that does not exist. The selected month is the only one at
 * full strength; the rest recede, which is what makes the comparison readable
 * without a legend.
 *
 * Bars are links, so the trend doubles as the fastest way to jump months.
 * Heights use a percentage of the tallest bar rather than an axis: the exact
 * figures are already written underneath the selected one, and an axis on a
 * 40px-tall chart is decoration.
 */
export function MonthTrend({
  totals,
  selected,
  currency,
  basePath,
}: {
  totals: MonthTotal[];
  selected: string;
  currency: string;
  basePath: string;
}) {
  const peak = Math.max(...totals.map((t) => t.total), 0);
  if (peak <= 0) return null;

  const current = totals.find((t) => t.month === selected);

  return (
    <div>
      <div className="flex items-baseline justify-between pb-4">
        <h2 className="flex items-center gap-1.5 text-label uppercase text-ink-faint">
          <Icon name="bar_chart" size={14} aria-hidden />
          Last 6 months
        </h2>
        {current ? (
          <span className="tabular text-meta text-ink-faint">
            {formatMoney(current.total, currency, { compact: true })}
          </span>
        ) : null}
      </div>

      {/* Bars are capped rather than stretched: `flex-1` alone turned a
          six-column chart into six slabs the width of the page on a desktop,
          which reads as a heavy graphic rather than a small reference. */}
      <div className="flex items-end gap-2">
      {totals.map(({ month, total }) => {
        const active = month === selected;
        // A month with spending never renders as nothing — a 2px floor keeps
        // the bar present so the gap reads as "small", not "missing".
        const height = total > 0 ? Math.max(8, (total / peak) * 100) : 2;
        const initial = parseMonthIso(month).toLocaleDateString("en-GB", {
          month: "short",
        });

        return (
          <PressLink
            key={month}
            href={`${basePath}?m=${month}`}
            scroll={false}
            aria-label={`${initial}: ${formatMoney(total, currency, { compact: true })}`}
            aria-current={active ? "true" : undefined}
            className="tap group flex w-full max-w-[64px] flex-1 flex-col items-center gap-2
              rounded-md pt-1"
          >
            <span className="flex h-12 w-full items-end">
              <span
                className="w-full rounded-sm transition-colors"
                style={{
                  height: `${height}%`,
                  backgroundColor: active
                    ? "var(--color-ink)"
                    : "var(--color-line-strong)",
                }}
              />
            </span>
            <span
              className={`text-label uppercase ${
                active ? "text-ink" : "text-ink-faint"
              }`}
            >
              {initial}
            </span>
          </PressLink>
        );
      })}
      </div>
    </div>
  );
}
