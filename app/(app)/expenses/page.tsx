import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { TopAppBar } from "@/components/top-app-bar";
import { ExpenseRow } from "@/components/expense-row";
import { getExpensesBetween, getProfile } from "@/lib/queries";
import { formatFullDate, formatMoney, monthRange } from "@/lib/format";
import type { ExpenseWithCategory } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "All expenses · SpentWise",
};

export default async function ExpensesPage() {
  const profile = await getProfile();
  const { start, end } = monthRange();
  const expenses = await getExpensesBetween(start, end);

  const currency = profile.currency;
  const monthName = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const monthTotal = expenses.reduce((sum, row) => sum + Number(row.amount), 0);

  // Group into day buckets; the query already returns them newest-first.
  const byDay = new Map<string, ExpenseWithCategory[]>();
  for (const expense of expenses) {
    const key = expense.spent_at.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), expense]);
  }

  return (
    <>
      <TopAppBar
        title="All expenses"
        subtitle={`${monthName} · ${formatMoney(monthTotal, currency, { compact: true })}`}
        backHref="/home"
      />

      <main className="mx-auto w-full max-w-md px-gutter">
        {expenses.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-body text-ink-muted">No expenses this month.</p>
            <Link
              href="/add"
              className="tap mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7
                text-title text-paper"
            >
              <Icon name="add" size={20} className="text-paper" />
              Add one
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {[...byDay.entries()].map(([day, rows]) => {
              const dayTotal = rows.reduce(
                (sum, row) => sum + Number(row.amount),
                0,
              );

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
                        deletable
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
