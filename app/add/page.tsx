import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { getCategories, getProfile } from "@/lib/queries";
import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = {
  title: "Add expense · SpentWise",
};

/**
 * Deliberately outside the (app) tab shell: no bottom nav, nothing to browse
 * to. It's one task, and the only ways out are Save or Close.
 */
export default async function AddExpensePage() {
  const [categories, profile] = await Promise.all([
    getCategories(),
    getProfile(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header
        className="flex items-center justify-between px-gutter pb-1 pt-4"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
      >
        <span className="text-label uppercase text-ink-faint">New expense</span>
        <Link
          href="/home"
          aria-label="Cancel"
          className="tap -mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted"
        >
          <Icon name="close" size={22} />
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <ExpenseForm categories={categories} currency={profile.currency} />
      </div>
    </div>
  );
}
