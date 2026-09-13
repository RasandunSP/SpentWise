import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { TopAppBar } from "@/components/top-app-bar";
import { MonthSwitcher } from "@/components/month-switcher";
import { ExpensesBrowser } from "@/components/expenses-browser";
import { PressLink } from "@/components/pressable";
import { getExpensesBetween, getProfile } from "@/lib/queries";
import { formatMoney, monthView } from "@/lib/format";

export const metadata: Metadata = {
  title: "All expenses · SpentWise",
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const view = monthView(m);

  const [profile, expenses] = await Promise.all([
    getProfile(),
    getExpensesBetween(view.start, view.end),
  ]);

  const currency = profile.currency;
  const monthTotal = expenses.reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <>
      <TopAppBar
        title={view.label}
        subtitle={`${expenses.length} ${
          expenses.length === 1 ? "expense" : "expenses"
        } · ${formatMoney(monthTotal, currency, { compact: true })}`}
        backHref="/home"
        action={<MonthSwitcher view={view} basePath="/expenses" />}
      />

      <main className="mx-auto w-full max-w-md px-gutter">
        {expenses.length === 0 && view.isCurrent ? (
          <div className="py-16 text-center">
            <p className="text-body text-ink-muted">No expenses this month.</p>
            <PressLink
              href="/add"
              className="tap mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7
                text-title text-paper"
            >
              <Icon name="add" size={20} className="text-paper" />
              Add one
            </PressLink>
          </div>
        ) : (
          <ExpensesBrowser expenses={expenses} currency={currency} />
        )}
      </main>
    </>
  );
}
