import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PressLink } from "@/components/pressable";
import {
  getCategoriesRanked,
  getCommonAmounts,
  getExpense,
  getProfile,
} from "@/lib/queries";
import { convert, getRates, PRIMARY_CURRENCY } from "@/lib/rates";
import { ExpenseForm } from "@/app/add/expense-form";

export const metadata: Metadata = {
  title: "Edit expense · SpentWise",
};

/**
 * Correcting an entry, on the same screen that created it.
 *
 * Outside the (app) tab shell for the same reason /add is: it is one task with
 * two ways out, and a nav bar would invite wandering off mid-edit.
 */
export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [expense, categories, profile, commonAmounts] = await Promise.all([
    getExpense(id),
    getCategoriesRanked(),
    getProfile(),
    getCommonAmounts(4),
  ]);

  const secondary = profile.secondary_currency;
  const rates = secondary ? await getRates() : null;
  const secondaryRate =
    secondary && rates ? convert(1, secondary, PRIMARY_CURRENCY, rates) : null;

  // Covers both a bad id and someone else's row — `getExpense` scopes to the
  // signed-in user, so "not yours" and "not there" are the same answer.
  if (!expense) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header
        className="flex items-center justify-between px-gutter pb-1 pt-4"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
      >
        <span className="text-label uppercase text-ink-faint">Edit expense</span>
        <PressLink
          href="/expenses"
          aria-label="Cancel"
          className="tap -mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted"
        >
          <Icon name="close" size={22} />
        </PressLink>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <ExpenseForm
          categories={categories}
          currency={profile.currency}
          expense={expense}
          commonAmounts={commonAmounts}
          secondaryCurrency={secondary}
          secondaryRate={secondaryRate}
          primaryCode={PRIMARY_CURRENCY}
        />
      </div>
    </div>
  );
}
