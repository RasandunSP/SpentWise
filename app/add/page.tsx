import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import {
  getCategoriesRanked,
  getCommonAmounts,
  getProfile,
} from "@/lib/queries";
import { convert, getRates, PRIMARY_CURRENCY } from "@/lib/rates";
import { ExpenseForm } from "./expense-form";
import { PressLink } from "@/components/pressable";

export const metadata: Metadata = {
  title: "Add expense · SpentWise",
};

/**
 * Deliberately outside the (app) tab shell: no bottom nav, nothing to browse
 * to. It's one task, and the only ways out are Save or Close.
 */
export default async function AddExpensePage() {
  const [categories, profile, commonAmounts] = await Promise.all([
    getCategoriesRanked(),
    getProfile(),
    getCommonAmounts(4),
  ]);

  // Only pay for rates when a second currency is actually configured.
  const secondary = profile.secondary_currency;
  const rates = secondary ? await getRates() : null;
  const secondaryRate =
    secondary && rates ? convert(1, secondary, PRIMARY_CURRENCY, rates) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header
        className="flex items-center justify-between px-gutter pb-1 pt-4"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
      >
        <span className="text-label uppercase text-ink-faint">New expense</span>
        <PressLink
          href="/home"
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
          commonAmounts={commonAmounts}
          secondaryCurrency={secondary}
          secondaryRate={secondaryRate}
          primaryCode={PRIMARY_CURRENCY}
        />
      </div>
    </div>
  );
}
