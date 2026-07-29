import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Wordmark } from "@/components/wordmark";
import { ExpenseRow } from "@/components/expense-row";
import {
  getCategoryTotals,
  getMonthSummary,
  getProfile,
  getRecentExpenses,
} from "@/lib/queries";
import { toneOf } from "@/lib/categories";
import { clampPercent, formatMoney, monthRange, splitMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Home · SpentWise",
};

export default async function HomePage() {
  const profile = await getProfile();
  const { start, end } = monthRange();

  const [summary, expenses, totals] = await Promise.all([
    getMonthSummary(Number(profile.monthly_budget)),
    getRecentExpenses(6),
    getCategoryTotals(start, end),
  ]);

  const currency = profile.currency;
  const headline = splitMoney(summary.total, currency);
  const monthName = new Date().toLocaleDateString("en-GB", { month: "long" });
  const overBudget = summary.remaining < 0;

  const spending = totals.filter((row) => Number(row.total) > 0);
  const top = spending[0];

  const tracked = totals
    .filter((row) => row.monthly_budget && Number(row.monthly_budget) > 0)
    .slice(0, 4);

  return (
    <>
      <header
        className="mx-auto w-full max-w-md px-gutter pt-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          <Wordmark />
          <Link
            href="/settings"
            aria-label="Settings"
            className="tap -mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-faint"
          >
            <Icon name="tune" size={22} />
          </Link>
        </div>

        <div className="pt-8">
          <p className="text-title font-normal text-ink-faint">{greeting()},</p>
          <h1
            className="pt-1 text-ink"
            style={{
              fontSize: "2.25rem",
              lineHeight: 1.1,
              fontWeight: 300,
              letterSpacing: "-0.035em",
            }}
          >
            {profile.display_name ?? "Welcome back"}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-gutter">
        {/* --- The anchor. One dark panel, and the eye lands here first. --- */}
        <section className="pt-7">
          <div className="relative overflow-hidden rounded-xl bg-ink px-6 pb-7 pt-6">
            <div className="flex items-start justify-between gap-4">
              <span className="text-label uppercase text-paper/50">
                Spent in {monthName}
              </span>

              {summary.changePercent !== null ? (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-meta ${
                    summary.changePercent > 0
                      ? "bg-paper/10 text-paper"
                      : "bg-paper/10 text-paper"
                  }`}
                >
                  <Icon
                    name={
                      summary.changePercent > 0 ? "arrow_upward" : "arrow_downward"
                    }
                    size={13}
                    weight={400}
                  />
                  {Math.abs(summary.changePercent).toFixed(1)}%
                </span>
              ) : null}
            </div>

            <p className="flex items-baseline gap-2.5 pt-5">
              <span className="text-figure-sm font-light text-paper/55">
                {headline.prefix}
              </span>
              <span className="tabular text-figure text-paper">
                {headline.number}
              </span>
            </p>

            <p className="pt-3 text-meta text-paper/55">
              {summary.changePercent === null
                ? "First month of tracking."
                : summary.changePercent > 0
                  ? "More than last month at this point."
                  : "Less than last month at this point."}
            </p>
          </div>
        </section>

        {/* --- The action this app exists for. ---------------------------- */}
        <section className="pt-4">
          <Link
            href="/add"
            className="tap flex h-16 w-full items-center justify-center gap-2.5 rounded-xl
              bg-accent text-on-accent"
          >
            <Icon name="add" size={24} weight={400} className="text-on-accent" />
            <span className="text-title" style={{ fontSize: "1.125rem" }}>
              Add expense
            </span>
          </Link>
        </section>

        {/* --- Two quick reads, side by side. ----------------------------- */}
        <section className="grid grid-cols-2 gap-3 pt-4">
          <Tile
            label={
              summary.budget > 0
                ? overBudget
                  ? "Over budget"
                  : "Left to spend"
                : "Budget"
            }
            value={
              summary.budget > 0
                ? formatMoney(Math.abs(summary.remaining), currency, {
                    compact: true,
                  })
                : "Not set"
            }
            tone={summary.budget > 0 && overBudget ? "negative" : "default"}
            href={summary.budget > 0 ? undefined : "/settings"}
            foot={
              summary.budget > 0
                ? `${Math.round(summary.usedPercent)}% of ${formatMoney(summary.budget, currency, { compact: true })}`
                : "Tap to set one"
            }
          />
          <Tile
            label="Top category"
            value={top ? top.category_name : "—"}
            foot={
              top
                ? formatMoney(Number(top.total), currency, { compact: true })
                : `${summary.daysLeft} days left in ${monthName}`
            }
            dot={top ? toneOf(top.tone).hex : undefined}
          />
        </section>

        {/* --- Budget progress, if there is one. -------------------------- */}
        {summary.budget > 0 ? (
          <section className="pt-7">
            <div className="h-1 w-full overflow-hidden rounded-full bg-paper-sunk">
              <div
                className="h-1 rounded-full"
                style={{
                  width: `${clampPercent(summary.usedPercent)}%`,
                  backgroundColor: overBudget
                    ? "var(--color-negative)"
                    : "var(--color-accent)",
                }}
              />
            </div>
            <div className="flex justify-between pt-2.5">
              <span className="text-meta text-ink-faint">
                {formatMoney(summary.total, currency, { compact: true })} spent
              </span>
              <span className="text-meta text-ink-faint">
                {summary.daysLeft} {summary.daysLeft === 1 ? "day" : "days"} left
              </span>
            </div>
          </section>
        ) : null}

        {/* --- Recent. ---------------------------------------------------- */}
        <section className="pt-section">
          <div className="flex items-baseline justify-between pb-1">
            <h2 className="text-label uppercase text-ink-faint">Recent</h2>
            {expenses.length > 0 ? (
              <Link href="/expenses" className="text-label uppercase text-accent">
                View all
              </Link>
            ) : null}
          </div>

          {expenses.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </section>

        {/* --- Category budgets, only if any are set. ---------------------- */}
        {tracked.length > 0 ? (
          <section className="pt-section">
            <h2 className="text-label uppercase text-ink-faint">
              Category budgets
            </h2>
            <div className="flex flex-col gap-5 pt-5">
              {tracked.map((row) => {
                const budget = Number(row.monthly_budget);
                const percent = clampPercent((Number(row.total) / budget) * 100);
                const over = Number(row.total) > budget;
                const tone = toneOf(row.tone);

                return (
                  <div key={row.category_id}>
                    <div className="flex items-baseline justify-between pb-2">
                      <span className="text-body text-ink-muted">
                        {row.category_name}
                      </span>
                      <span
                        className={`tabular text-meta ${
                          over ? "text-negative" : "text-ink-faint"
                        }`}
                      >
                        {Math.round(percent)}%
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-paper-sunk">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: over
                            ? "var(--color-negative)"
                            : tone.hex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}

function Tile({
  label,
  value,
  foot,
  href,
  dot,
  tone = "default",
}: {
  label: string;
  value: string;
  foot?: string;
  href?: string;
  dot?: string;
  tone?: "default" | "negative";
}) {
  const body = (
    <>
      <span className="text-label uppercase text-ink-faint">{label}</span>
      <span className="flex items-baseline gap-2 pt-2.5">
        {dot ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
          />
        ) : null}
        <span
          className={`tabular truncate text-figure-sm ${
            tone === "negative" ? "text-negative" : "text-ink"
          }`}
        >
          {value}
        </span>
      </span>
      {foot ? (
        <span className="truncate pt-1.5 text-meta text-ink-faint">{foot}</span>
      ) : null}
    </>
  );

  const className =
    "flex min-w-0 flex-col rounded-xl border border-line px-4 py-4";

  return href ? (
    <Link href={href} className={`${className} tap`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <p className="text-body text-ink-muted">Nothing logged yet.</p>
      <p className="pt-1 text-meta text-ink-faint">
        Your first expense takes about ten seconds.
      </p>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
