import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { TopAppBar } from "@/components/top-app-bar";
import { ShareBar, type ShareSegment } from "@/components/share-bar";
import { getCategoryTotals, getMonthSummary, getProfile } from "@/lib/queries";
import { toneOf } from "@/lib/categories";
import { clampPercent, formatMoney, monthRange, splitMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reports · SpentWise",
};

/** Past this many slices the tail folds into a single grey "Other". */
const MAX_SEGMENTS = 5;

export default async function ReportsPage() {
  const profile = await getProfile();
  const { start, end } = monthRange();

  const [totals, summary] = await Promise.all([
    getCategoryTotals(start, end),
    getMonthSummary(Number(profile.monthly_budget)),
  ]);

  const currency = profile.currency;
  const monthName = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const spending = totals.filter((row) => Number(row.total) > 0);
  const spent = spending.reduce((sum, row) => sum + Number(row.total), 0);

  // Fold everything past the top few into "Other" rather than inventing hues.
  const head = spending.slice(0, MAX_SEGMENTS);
  const tail = spending.slice(MAX_SEGMENTS);
  const tailTotal = tail.reduce((sum, row) => sum + Number(row.total), 0);

  const segments: ShareSegment[] = [
    ...head.map((row) => ({
      id: row.category_id,
      label: row.category_name,
      value: Number(row.total),
      tone: row.tone,
    })),
    ...(tailTotal > 0
      ? [
          {
            id: "other",
            label: `Other (${tail.length})`,
            value: tailTotal,
            tone: "slate",
          },
        ]
      : []),
  ];

  const remaining = splitMoney(Math.abs(summary.remaining), currency);
  const overBudget = summary.remaining < 0;

  return (
    <>
      <TopAppBar title="Reports" subtitle={monthName} />

      <main className="mx-auto w-full max-w-md px-gutter">
        {/* --- Budget: one ratio against a limit. ------------------------ */}
        {summary.budget > 0 ? (
          <section className="pb-section pt-4">
            <p className="text-label uppercase text-ink-faint">
              {overBudget ? "Over budget by" : "Remaining"}
            </p>
            <p className="flex items-baseline gap-2.5 pt-3">
              <span className="text-figure-sm font-light text-ink-faint">
                {remaining.prefix}
              </span>
              <span
                className={`tabular text-figure ${overBudget ? "text-negative" : "text-ink"}`}
              >
                {remaining.number}
              </span>
            </p>

            <div className="mt-5 h-px w-full bg-line-strong">
              <div
                className="h-px"
                style={{
                  width: `${clampPercent(summary.usedPercent)}%`,
                  backgroundColor: overBudget
                    ? "var(--color-negative)"
                    : "var(--color-ink)",
                }}
              />
            </div>

            <div className="flex justify-between pt-3">
              <span className="text-meta text-ink-faint">
                {formatMoney(summary.total, currency, { compact: true })} of{" "}
                {formatMoney(summary.budget, currency, { compact: true })}
              </span>
              <span className="tabular text-meta text-ink-muted">
                {Math.round(summary.usedPercent)}%
              </span>
            </div>
          </section>
        ) : (
          <section className="pb-section pt-4">
            <Link
              href="/settings"
              className="tap flex items-center justify-between text-ink-muted"
            >
              <span className="text-body">Set a monthly budget</span>
              <Icon name="arrow_forward" size={18} />
            </Link>
          </section>
        )}

        {spent === 0 ? (
          <section className="border-t border-line py-16 text-center">
            <p className="text-body text-ink-muted">
              Nothing to report for {monthName}.
            </p>
            <p className="pt-1 text-meta text-ink-faint">
              Log a few expenses and the breakdown appears here.
            </p>
          </section>
        ) : (
          <>
            {/* --- Share. ---------------------------------------------- */}
            <section className="border-t border-line pb-section pt-6">
              <h2 className="pb-5 text-label uppercase text-ink-faint">
                Category share
              </h2>
              <ShareBar segments={segments} total={spent} currency={currency} />
            </section>

            {/* --- Breakdown. ------------------------------------------ */}
            <section className="border-t border-line pt-6">
              <h2 className="text-label uppercase text-ink-faint">Breakdown</h2>

              <div className="flex flex-col pt-2">
                {totals.map((row) => {
                  const total = Number(row.total);
                  const percent = spent > 0 ? (total / spent) * 100 : 0;
                  const tone = toneOf(row.tone);

                  return (
                    <div
                      key={row.category_id}
                      className={`border-b border-line py-4 last:border-b-0 ${
                        total === 0 ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3 pb-2.5">
                        <div className="flex min-w-0 items-baseline gap-2.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: tone.hex }}
                          />
                          <span className="truncate text-title text-ink">
                            {row.category_name}
                          </span>
                        </div>
                        <span className="tabular shrink-0 text-title font-normal text-ink">
                          {formatMoney(total, currency, { compact: true })}
                        </span>
                      </div>
                      <div className="h-px w-full bg-line">
                        <div
                          className="h-px"
                          style={{
                            width: `${clampPercent(percent)}%`,
                            backgroundColor: tone.hex,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* --- One observation, not a wall of stats. ---------------- */}
            <section className="border-t border-line pt-6">
              <h2 className="text-label uppercase text-ink-faint">Insight</h2>
              <p className="pt-3 text-body leading-relaxed text-ink-muted">
                {buildInsight({
                  topName: spending[0]?.category_name,
                  topShare: spending[0]
                    ? (Number(spending[0].total) / spent) * 100
                    : 0,
                  changePercent: summary.changePercent,
                })}
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function buildInsight({
  topName,
  topShare,
  changePercent,
}: {
  topName?: string;
  topShare: number;
  changePercent: number | null;
}) {
  const parts: string[] = [];

  if (topName) {
    parts.push(
      `${topName} is your biggest category this month at ${Math.round(topShare)}% of everything you spent.`,
    );
  }

  if (changePercent !== null) {
    const magnitude = Math.abs(changePercent).toFixed(0);
    parts.push(
      changePercent > 0
        ? `You're ${magnitude}% up on last month so far.`
        : `You're ${magnitude}% down on last month — nice work.`,
    );
  }

  return parts.join(" ") || "Keep logging and patterns will show up here.";
}
