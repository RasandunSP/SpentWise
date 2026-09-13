import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { TopAppBar } from "@/components/top-app-bar";
import { MonthSwitcher } from "@/components/month-switcher";
import { MonthTrend } from "@/components/month-trend";
import { PressLink } from "@/components/pressable";
import { ExpenseRow } from "@/components/expense-row";
import {
  getCategoryChanges,
  getLargestExpenses,
  getMonthlyTotals,
  getMonthSummary,
  getProfile,
} from "@/lib/queries";
import { toneOf } from "@/lib/categories";
import { clampPercent, formatMoney, monthView, splitMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reports · SpentWise",
};

/**
 * Four questions, in the order people actually ask them:
 *
 *   1. How much, and is that a lot for me?      → the headline
 *   2. Is it getting worse?                      → the trend
 *   3. What changed?                             → categories, with deltas
 *   4. What caused it?                           → the largest few expenses
 *
 * The previous version answered none of them directly: it showed a share bar
 * (where money went, which the breakdown already said), a breakdown with no
 * comparison, and a generic sentence. A breakdown tells you where money went;
 * only a *diff* tells you what to do about it, so every category row now
 * carries last month alongside it.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const view = monthView(m);

  const profile = await getProfile();

  const [changes, summary, trend, largest] = await Promise.all([
    getCategoryChanges(view.month),
    getMonthSummary(Number(profile.monthly_budget), view.month),
    getMonthlyTotals(6, view.month),
    getLargestExpenses(view.start, view.end, 3),
  ]);

  const currency = profile.currency;
  const spending = changes.filter((row) => row.total > 0);
  const spent = spending.reduce((sum, row) => sum + row.total, 0);
  const headline = splitMoney(spent, currency);

  // "A lot" only means something against your own history, so the comparison
  // is the average of the other months on screen — not a target, just context.
  //
  // Two months minimum: against a single prior month a quiet start reads as
  // "2690% above your usual", which is arithmetically true and completely
  // useless. Until there is a baseline worth the name, say so instead.
  const others = trend.filter((t) => t.month !== view.month && t.total > 0);
  const typical =
    others.length >= 2
      ? others.reduce((sum, t) => sum + t.total, 0) / others.length
      : 0;
  const vsTypical = typical > 0 ? ((spent - typical) / typical) * 100 : null;

  // Without a previous month there is nothing to diff against, and tagging
  // every row "new" is noise dressed up as information.
  const hasPrevious = changes.some((row) => row.previous > 0);

  const overBudget = summary.remaining < 0;

  return (
    <>
      <TopAppBar
        title="Reports"
        subtitle={view.label}
        action={<MonthSwitcher view={view} basePath="/reports" />}
      />

      <main className="mx-auto w-full max-w-md px-gutter lg:max-w-4xl">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
          <div className="lg:col-span-2">
            {/* --- 1. How much. ------------------------------------------ */}
            <section className="pt-4">
              <p className="text-label uppercase text-ink-faint">
                Spent in {view.label}
              </p>
              <p className="flex items-baseline gap-2.5 pt-3">
                <span className="text-figure-sm font-light text-ink-faint">
                  {headline.prefix}
                </span>
                <span className="tabular text-figure text-ink">
                  {headline.number}
                </span>
              </p>
              <p className="pt-2 text-meta text-ink-faint">
                {vsTypical === null
                  ? "Not enough history to compare yet."
                  : Math.abs(vsTypical) < 5
                    ? "About typical for you."
                    : vsTypical > 0
                      ? `${Math.round(vsTypical)}% above your usual month.`
                      : `${Math.round(Math.abs(vsTypical))}% below your usual month.`}
              </p>
            </section>

            {/* --- 2. Is it getting worse. ------------------------------- */}
            <section className="pt-7">
              <MonthTrend
                totals={trend}
                selected={view.month}
                currency={currency}
                basePath="/reports"
              />
            </section>
          </div>

          {/* --- Budget, only when there is one. ------------------------- */}
          <div className="lg:col-span-2">
            {summary.budget > 0 ? (
              <section className="mt-section border-t border-line pt-6">
                <div className="flex items-baseline justify-between">
                  <p className="text-label uppercase text-ink-faint">
                    {overBudget ? "Over budget by" : "Left to spend"}
                  </p>
                  <span className="tabular text-meta text-ink-muted">
                    {Math.round(summary.usedPercent)}% used
                  </span>
                </div>

                <p
                  className={`tabular pt-3 text-figure-sm ${
                    overBudget ? "text-negative" : "text-ink"
                  }`}
                >
                  {formatMoney(Math.abs(summary.remaining), currency, {
                    compact: true,
                  })}
                </p>

                {/* Two marks: spent, and where an even pace would be today.
                    The gap between them is the actionable part — "62% used"
                    means nothing until you know whether it's the 5th or 25th. */}
                <div className="relative mt-4 h-px w-full bg-line-strong">
                  <div
                    className="h-px"
                    style={{
                      width: `${clampPercent(summary.usedPercent)}%`,
                      backgroundColor: overBudget
                        ? "var(--color-negative)"
                        : "var(--color-ink)",
                    }}
                  />
                  {summary.elapsed > 0 && summary.elapsed < 1 ? (
                    <span
                      aria-hidden
                      className="absolute -top-1 h-[9px] w-px bg-ink-faint"
                      style={{ left: `${clampPercent(summary.elapsed * 100)}%` }}
                    />
                  ) : null}
                </div>

                {summary.elapsed > 0 && summary.elapsed < 1 ? (
                  <p className="pt-3 text-meta text-ink-faint">
                    {summary.paceDelta > 0
                      ? `${formatMoney(summary.paceDelta, currency, { compact: true })} ahead of an even pace.`
                      : `${formatMoney(Math.abs(summary.paceDelta), currency, { compact: true })} under an even pace.`}
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="mt-section border-t border-line pt-6">
                <PressLink
                  href="/settings"
                  className="tap flex items-center justify-between text-ink-muted"
                >
                  <span className="text-body">Set a monthly budget</span>
                  <Icon name="arrow_forward" size={18} />
                </PressLink>
              </section>
            )}
          </div>

          {spent === 0 ? (
            <section className="mt-section border-t border-line py-16 text-center lg:col-span-2">
              <p className="text-body text-ink-muted">
                Nothing logged in {view.label}.
              </p>
              <p className="pt-1 text-meta text-ink-faint">
                Add a few expenses and the breakdown appears here.
              </p>
            </section>
          ) : (
            <>
              {/* --- 3. What changed. --------------------------------- */}
              <section className="mt-section border-t border-line pt-6">
                <h2 className="text-label uppercase text-ink-faint">
                  Where it went
                </h2>
                {hasPrevious ? (
                  <p className="pb-2 pt-2 text-meta text-ink-faint">
                    Compared with the month before.
                  </p>
                ) : (
                  <p className="pb-2 pt-2 text-meta text-ink-faint">
                    Share of this month&rsquo;s spending.
                  </p>
                )}

                <div className="flex flex-col">
                  {spending.map((row) => {
                    const share = spent > 0 ? (row.total / spent) * 100 : 0;
                    const tone = toneOf(row.tone);
                    const isNew = row.previous === 0;
                    const changed = Math.abs(row.delta) > 0.5;

                    return (
                      <div
                        key={row.category_id}
                        className="border-b border-line py-4 last:border-b-0"
                      >
                        <div className="flex items-baseline justify-between gap-3 pb-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Icon
                              name={row.icon}
                              size={18}
                              className="shrink-0"
                              style={{ color: tone.color }}
                            />
                            <span className="truncate text-title text-ink">
                              {row.category_name}
                            </span>
                            <span className="tabular shrink-0 text-meta text-ink-faint">
                              {Math.round(share)}%
                            </span>
                          </div>

                          {/* The change is a signed figure, not an arrow: the
                              sign carries the direction without depending on
                              colour, and the column stays scannable. */}
                          <div className="flex shrink-0 items-baseline gap-2.5">
                            <span className="tabular text-title font-normal text-ink">
                              {formatMoney(row.total, currency, { compact: true })}
                            </span>
                            {hasPrevious ? (
                              <span
                                className={`tabular w-16 text-right text-meta ${
                                  !changed
                                    ? "text-ink-faint"
                                    : row.delta > 0
                                      ? "text-negative"
                                      : "text-positive"
                                }`}
                              >
                                {isNew
                                  ? "new"
                                  : !changed
                                    ? "—"
                                    : `${row.delta > 0 ? "+" : "−"}${formatMoney(
                                        Math.abs(row.delta),
                                        "",
                                        { compact: true },
                                      ).trim()}`}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="h-px w-full bg-line">
                          <div
                            className="h-px"
                            style={{
                              width: `${clampPercent(share)}%`,
                              backgroundColor: tone.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* --- 4. What caused it. ------------------------------- */}
              {largest.length > 0 ? (
                <section className="mt-section border-t border-line pt-6">
                  <h2 className="text-label uppercase text-ink-faint">
                    Biggest this month
                  </h2>
                  <div className="flex flex-col pt-2">
                    {largest.map((expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        currency={currency}
                        href={`/edit/${expense.id}`}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
